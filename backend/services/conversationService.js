const Conversations = require('../models/Conversations');
const Department = require('../models/Department');
const Permissions = require('../models/Permissions');
const Users = require('../models/Users');
const helper = require('../helper/permission');
const ConversationMember = require('../models/ConversationMember');
const { default: mongoose } = require('mongoose');

const createConvDepartment = async (departmentData, creator) => {
	try {
		const department = await Department.findById(departmentData.departmentId).lean().exec();
		if (!department) throw new Error('Department not found');

		const conversation = await Conversations.create({
			type: 'department',
			name: departmentData.name || department.name,
			avatarGroup: departmentData.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
			creator: creator._id,
			departmentId: department._id,
			pinned: true
		});

		const deptHeader = await Users.find({
			department: department._id,
			position: 'Department Head'
		}).select('_id').lean().exec();

		const deputyHeader = await Users.find({
			department: department._id,
			position: 'Deputy Department'
		}).select('_id').lean().exec();

		await ConversationMember.create({
			conversationId: conversation._id,
			memberId: department.header,
			role: 'admin',
			permissions: {
				canChat: true,
				canAddMembers: true,
				canRemoveMembers: true,
				canEditConversation: true,
				canAssignDeputies: true
			}
		});

		for (const deputy of deputyHeader) {
			await ConversationMember.create({
				conversationId: conversation._id,
				memberId: deputy._id,
				role: 'deputy_admin',
				permissions: {
					canChat: true,
					canAddMembers: true,
					canRemoveMembers: true,
					canEditConversation: true
				}
			})
		};

		for (member of department.members) {

			const isHead = deptHeader.some(head => head._id.toString() === member.toString());
			const isDeputy = deputyHeader.some(deputy => deputy._id.toString() === member.toString());

			if (isHead || isDeputy) continue;

			await ConversationMember.create({
				conversationId: conversation._id,
				memberId: member,
				role: 'member',
				permissions: {
					canChat: false,
					canAddMembers: false,
					canRemoveMembers: false,
					canEditConversation: false
				}
			});
		};

		await Department.updateOne(
			{ _id: department._id },
			{ conversationId: conversation._id }
		)

		return conversation;
	} catch (error) {
		throw error;
	}
};

const updateConvDepartment = async (updateData, user) => {
	try {

		console.log('user', user);
		const conversation = await Conversations.findById(updateData.conversationId);
		if (!conversation || conversation.type !== 'department') throw new Error('Conversation not found');

		const member = await ConversationMember.findOne({
			conversationId: conversation._id,
			memberId: user._id
		}).lean().exec();

		console.log('member', member);

		if (!member) throw new Error('User is not a member of this conversation');

		if (member.role !== 'admin' && member.role !== 'deputy_admin') {
			throw new Error('User does not have sufficient permissions for this action');
		};

		if (!member.permissions.canEditConversation) {
			throw new Error('User does not have permission to edit conversation');
		};

		const updateFields = {};

		if (updateData.name) {
			updateFields.name = updateData.name;
		}

		if (updateData.avatarGroup) {
			updateFields.avatarGroup = updateData.avatarGroup;
		};

		updateFields.updaatedAt = new Date();

		const updatedConversation = await Conversations.findByIdAndUpdate(
			conversation._id,
			{ $set: updateFields },
			{ new: true }
		)

		if (updateData.addMembers && updateData.addMembers.length > 0 && Array.isArray(updateData.addMembers)) {

			if (!member.permissions.canAddMembers) {
				throw new Error('User does not have permission to add members');
			}

			const department = await Department.findById(conversation.departmentId).lean().exec();
			if (!department) throw new Error('Department not found');

			const departmentUsers = await Users.find({
				deparment: department._id,
				_id: { $in: department.members },
			}).select('_id').lean().exec();

			for (const user of departmentUsers) {
				const existingMember = await ConversationMember.findOne({
					conversationId: conversation._id,
					memberId: user._id
				});

				if (!existingMember) {
					await ConversationMember.create({
						conversationId: conversation._id,
						memberId: user._id,
						role: 'member',
						permissions: {
							canChat: false,
							canAddMembers: false,
							canRemoveMembers: false,
							canEditConversation: false
						}
					});
				}
			}
		}

		if (updateData.removeMembers && updateData.removeMembers.length > 0 && Array.isArray(updateData.removeMembers)) {
			if (!member.permissions.canRemoveMembers) {
				throw new Error('User does not have permission to remove members');
			}

			const adminMembers = await ConversationMember.find({
				conversationId: conversation._id,
				role: { $in: ['admin', 'deputy_admin'] }
			}).select('memberId').lean().exec();

			const adminIds = adminMembers.map(member => member.memberId.toString());

			const safeToRemove = updateData.removeMembers.filter(
				memberId => !adminIds.includes(memberId.toString())
			);

			if (safeToRemove.length > 0) {
				await ConversationMember.deleteMany({
					conversationId: conversation._id,
					memberId: { $in: safeToRemove },
					role: 'member'
				})
			}
		}
		return updatedConversation;

	} catch (error) {
		throw error;
	}
};

const deleteConvDepartment = async (conversationId, user) => {
	try {
		const conversation = await Conversations.findById(conversationId);
		if (!conversation || conversation.type !== 'department') throw new Error('Conversation not found');

		const member = await ConversationMember.findOne({
			conversationId: conversation._id,
			memberId: user._id,
			role: 'admin'
		});

		if (!member) throw new Error('User is not an admin of this conversation');

		if (conversation.departmentId) {
			await Department.findByIdAndUpdate(
				conversation.departmentId,
				{ $unset: { conversationId: 1 } }
			)
		}
		await ConversationMember.deleteMany({ conversationId: conversation._id });

		await Conversations.findByIdAndDelete(conversation._id);
		return {
			success: true,
			message: 'Department conversation deleted'
		}
	} catch (error) {
		throw error;
	}
}

const createConvGroup = async (groupData, creator) => {
	try {

		if (!groupData.name) throw new Error('Group name is required');
		if (!groupData.members || !Array.isArray(groupData.members)) {
			throw new Error('Participants are required');
		}

		if (!groupData.members.includes(creator._id)) {
			groupData.members.push(creator._id);
		}

		const conversation = await Conversations.create({
			type: 'group',
			name: groupData.name,
			avatarGroup: groupData.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
			creator: creator._id,
		});

		await ConversationMember.create({
			conversationId: conversation._id,
			memberId: creator._id,
			role: 'admin',
			permissions: {
				canChat: true,
				canAddMembers: true,
				canRemoveMembers: true,
				canEditConversation: true,
				canAssignDeputies: true
			}
		});

		for (const participantId of groupData.members) {
			if (participantId.toString() === creator._id.toString()) continue;

			await ConversationMember.create({
				conversationId: conversation._id,
				memberId: participantId,
				role: 'member',
				permissions: {
					canChat: true,
					canAddMembers: false,
					canRemoveMembers: false,
					canEditConversation: false,
					canAssignDeputies: false
				}
			});
		};
		return conversation;
	} catch (error) {
		throw error;
	}
}

const checkconversationPermission = async (conversationId, userId, requiredRole = ['admin', 'deputy_admin']) => {
	try {
		const member = await ConversationMember.findOne({
			conversationId: conversationId,
			memberId: userId
		});

		if (!member) throw new Error('User is not a member of this conversation');

		if (!requiredRole.includes(member.role)) throw new Error('User does not have sufficient permissions for this action');

		return member;
	} catch (error) {
		throw error;
	}
}

const updateAllMembersChat = async (conversationId, userId, chatEnabled) => {
	try {
		await checkconversationPermission(conversationId, userId, ['admin', 'deputy_admin']);

		const updateResult = await ConversationMember.updateMany(
			{ 
				conversationId,
				role: 'member'
			},
			{ $set: { 'permissions.canChat': chatEnabled } }
		);

		return {
			success: true,
			message: `Chat ${chatEnabled ? 'enabled' : 'disabled'} for all members`,
			modifiedCount: updateResult.modifiedCount
		}
	} catch (error) {
		throw error;
	}
}

const assignDeputyAdmin = async (conversationId, currentUserId, targetUserId) => {
	try {
		const currentMember = await checkconversationPermission(conversationId, currentUserId, ['admin', 'deputy_admin']);

		if (!currentMember.permissions.canAssignDeputies) {
			throw new Error('You do not have permission to assign deputy admins');
		}

		const targetMember = await ConversationMember.findOne({
			conversationId: conversationId,
			memberId: targetUserId
		});

		if (!targetMember) throw new Error('Target user is not a member of this conversation');

		if (targetMember.role === 'admin' || targetMember.role === 'deputy_admin') {
			throw new Error('Target user is already an admin or deputy admin');
		};

		const updatedMember = await ConversationMember.findOneAndUpdate(
			{ conversationId, memberId: targetUserId },
			{
				$set: {
					role: 'deputy_admin',
					permissions: {
						canChat: true,
						canAddMembers: true,
						canRemoveMembers: true,
						canEditConversation: true,
						canAssignDeputies: true
					}
				}
			},
			{ new: true }
		);

		return {
			success: true,
			message: 'Deputy admin assigned',
			data: updatedMember
		}
	} catch (error) {
		throw error;
	}
}

const transferAdminRole = async (conversationId, currentUserId, newAdminId) => {
	try {
		const currentAdmin = await checkconversationPermission(conversationId, currentUserId, ['admin']);

		if (!currentAdmin.permissions.canAssignDeputies) {
			throw new Error('You do not have permission to transfer admin role');
		}

		const newAdmin = await ConversationMember.findOne({
			conversationId: conversationId,
			memberId: newAdminId
		});

		if (!newAdmin) throw new Error('New admin is not a member of this conversation');

		const members = await ConversationMember.find({
			conversationId: conversationId,
		}).lean().exec();
		if (!members) throw new Error('Members not found');

		const defaultMember = members.find(member => member.role === 'member');

		await ConversationMember.findOneAndUpdate(
			{ conversationId, memberId: currentUserId },
			{
				$set: {
					role: 'member',
					permissions: {
						canChat: defaultMember ? defaultMember.permissions.canChat : false,
						canAddMembers: false,
						canRemoveMembers: false,
						canEditConversation: false,
						canAssignDeputies: false
					}
				}
			}
		)

		await ConversationMember.findOneAndUpdate(
			{ conversationId, memberId: newAdminId },
			{
				$set: {
					role: 'admin',
					permissions: {
						canChat: true,
						canAddMembers: true,
						canRemoveMembers: true,
						canEditConversation: true,
						canAssignDeputies: true
					}
				}
			}
		);
		return {
			success: true,
			message: 'Admin role transferred successfully',
			newAdminId: newAdminId
		}

	} catch (error) {
		throw error;
	}
}
module.exports = {
	createConvDepartment,
	updateConvDepartment,
	deleteConvDepartment,
	createConvGroup,
	updateAllMembersChat,
	assignDeputyAdmin,
	transferAdminRole
}