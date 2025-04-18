const Conversations = require('../models/Conversations');
const Department = require('../models/Department');
const Users = require('../models/Users');
const ConversationMember = require('../models/ConversationMember');
const socketService = require('./socketService');

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

		await socketService.getSocket().createPersonalizedSystemmessage({
			conversationId: conversation._id,
			actorId: creator._id,
			action: 'create_conversation',
			data: { conversationName: conversation.name }
		})

		await socketService.getSocket().notifyDepartmentConversationCreated(conversation);

		return conversation;
	} catch (error) {
		throw error;
	}
};

const updateConvDepartment = async (conversationId, updateData, updatedBy, conversationType) => {
	console.log('memberId:', updatedBy._id);
	try {
		const conversation = await Conversations.findById(conversationId).lean().exec();
		if (!conversation) throw new Error('Conversation not found');

		const user = await Users.findById(updatedBy._id)
			.select('position role')
			.populate('role', 'name')
			.lean().exec();

		const isSystemAdmin = user && (user.position === 'Administrator' || user.role.name === 'admin');
		if (!isSystemAdmin) {
			const member = await ConversationMember.findOne({
				conversationId: conversation._id,
				memberId: updatedBy._id
			}).lean().exec();

			if (!member) throw new Error('User is not a member of this conversation');

			if (member.role !== 'admin' && member.role !== 'deputy_admin') {
				throw new Error('User does not have sufficient permissions for this action');
			};

			if (!member.permissions.canEditConversation) {
				throw new Error('User does not have permission to edit conversation');
			};
			if (updateData.addMembers && updateData.addMembers.length > 0 && !member.permissions.canAddMembers){
				throw new Error('User does not have permission to add members');
			}
			if (updateData.removeMembers && updateData.removeMembers.length > 0 && !member.permissions.canRemoveMembers){
				throw new Error('User does not have permission to remove members');
			}
		}

		const updateFields = {};
		const systemMessageData = {
			conversationId: conversation._id,
			actorId: updatedBy._id,
			action: '',
			data: {}
		}

		if (updateData.name && updateData.name !== conversation.name) {
			updateFields.name = updateData.name;
			systemMessageData.action = 'update_name';
			systemMessageData.data = { newName: updateData.name, oldName: conversation.name };
		}

		if (updateData.avatarGroup) {
			updateFields.avatarGroup = updateData.avatarGroup;
			systemMessageData.action = 'update_avatar';
		};

		updateFields.updatedAt = new Date();

		let updatedConversation = await Conversations.findByIdAndUpdate(
			conversation._id,
			{ $set: updateFields },
			{ new: true }
		).lean().exec();

		if (updateData.addMembers && updateData.addMembers.length > 0 && Array.isArray(updateData.addMembers)) {
			const addedUsers = await Users.find({
				_id: { $in: updateData.addMembers },
			}).select('_id name').lean().exec();

			if (!addedUsers || addedUsers.length === 0) {
				throw new Error('No valid users found to add');
			}

			const addedMemberIds = [];

			for (const user of addedUsers) {
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
							canChat: conversationType === 'department' ? false : true,
							canAddMembers: false,
							canRemoveMembers: false,
							canEditConversation: conversationType === 'department' ? false : true,
						}
					});
					addedMemberIds.push(user._id.toString());
				}
			}

			if (addedMemberIds.length > 0) {
				if (conversationType === 'department') {
					await socketService.getSocket().notifyDepartmentConversationUpdated(updatedConversation);
				}
			}
		}

		if (updateData.removeMembers && updateData.removeMembers.length > 0 && Array.isArray(updateData.removeMembers)) {
		
			const adminMembers = await ConversationMember.find({
				conversationId: conversation._id,
				role: { $in: ['admin', 'deputy_admin'] }
			}).select('memberId').lean().exec();

			const adminIds = adminMembers.map(member => member.memberId.toString());

			const safeToRemove = updateData.removeMembers.filter(
				memberId => !adminIds.includes(memberId.toString())
			);

			const removedUsers = await Users.find({
				_id: { $in: safeToRemove }
			}).select('_id name').lean().exec();

			const removedMemberIds = removedUsers.map(user => user._id.toString());

			if (safeToRemove.length > 0 && removedMemberIds.length > 0) {
				await ConversationMember.deleteMany({
					conversationId: conversation._id,
					memberId: { $in: safeToRemove },
					role: 'member'
				});
				if (conversationType === 'department') {
					await socketService.getSocket().notifyDepartmentConversationUpdated(updatedConversation);
				}
			}
		}
		if (conversationType === 'department') {
			await socketService.getSocket().notifyDepartmentConversationUpdated(updatedConversation);
		}
		updatedConversation = await Conversations.findById(conversation._id).lean().exec();
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

	console.log('Group Data:', groupData);
	console.log('Creator:', creator);
	try {

		if (!groupData.name) throw new Error('Group name is required');
		if (!groupData.members || !Array.isArray(groupData.members)) {
			throw new Error('Participants are required');
		}

		if (!creator || !creator._id) {
			throw new Error('Creator is required');
		}

		if (!groupData.members.includes(creator._id.toString())) {
			groupData.members.push(creator._id.toString());
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

		await socketService.getSocket().createPersonalizedSystemmessage({
			conversationId: conversation._id,
			actorId: creator._id,
			action: 'create_conversation',
			data: { conversationName: conversation.name }
		})

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
		}).populate('memberId', 'name').lean().exec();

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
		).populate('memberId', 'name').lean().exec();
		return updatedMember;
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
		}).populate('memberId', 'name').lean().exec();

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

		const updatedUser = await ConversationMember.findOneAndUpdate(
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
		).populate('memberId', 'name').lean().exec();
		return updatedUser;

	} catch (error) {
		throw error;
	}
}

const getConvById = async (currentUserId) => {
	try {
		const user = await Users.findById(currentUserId).lean().exec();

		if (!user) throw new Error('User not found');

		const conversationMembers = await ConversationMember.find({
			memberId: currentUserId
		})
			.lean()
			.exec();

		const conversationIds = conversationMembers.map(cm => cm.conversationId);

		const conversations = await Conversations.find({
			_id: { $in: conversationIds }
		})
			.populate({
				path: 'lastMessage',
				select: 'content type createdAt attachments sentAt sender isRecalled isEdited status replyTo recallType metadata attachments',
				populate: [
					{
						path: 'sender',
						select: 'name avatar position status',
					},
					{
						path: 'replyTo',
						select: 'content type createdAt attachments sentAt sender isRecalled isEdited status replyTo',
						populate: {
							path: 'sender',
							select: 'name avatar position status'
						}
					},
					{
						path: 'attachments',
						select: 'fileName fileUrl fileType mimeType fileSize uploadedBy conversationId thumbnails'
					}
				]
			}).populate({
				path: 'departmentId',
				select: 'name avatarGroup members header'
			})
			.populate({
				path: 'creator',
				select: 'name avatar'
			})
			.lean()
			.exec();

		const populatedConversations = await Promise.all(
			conversations.map(async (conversation) => {
				const members = await ConversationMember.find({
					conversationId: conversation._id
				})
					.populate({
						path: 'memberId',
						select: 'name avatar position status',
						populate: {
							path: 'department',
							select: 'name'
						}
					})
					.lean();

				// Tạo mảng members với thông tin role và permissions bổ sung
				const enrichedMembers = members.map(member => {
					// Tạo đối tượng user từ memberId và bổ sung thêm role và permissions
					const memberData = {
						...member.memberId,  // Giữ nguyên thông tin user (name, avatar, position, status, department)
						role: member.role,
						permissions: member.permissions
					};
					return memberData;
				});

				const userMember = await ConversationMember.findOne({
					conversationId: conversation._id,
					memberId: currentUserId
				})
					.lean();

				return {
					_id: userMember._id,
					conversationInfo: {
						...conversation,
						members: enrichedMembers, // Sử dụng mảng members đã được bổ sung role và permissions
					},
					memberId: currentUserId,
					unreadCount: userMember.unreadCount,
					joinedAt: userMember.joinedAt
				}
			})
		)
		return populatedConversations;
	} catch (error) {
		throw error;
	}
}

const getAllConvDepartment = async () => {
	try {
		const conversations = await Conversations.find({ type: 'department' }).lean().exec();
		if (!conversations) throw new Error('No conversations found');

		const conversationIds = conversations.map(conversation => conversation._id);

		const conversationMember = await ConversationMember.find({
			conversationId: { $in: conversationIds }
		}).lean().exec();
		if (!conversationMember) {
			return conversations.map(conv => ({ ...conv, members: [] }));
		};
		const memberIds = [...new Set(conversationMember.map(member => member.memberId))];
		const members = await Users.find({ _id: { $in: memberIds } })
			.populate('name email avatar department position role')
			.lean().exec();

		if (!members) {
			return conversations.map(conv => ({ ...conv, members: [] }));
		};

		const enrichedConversations = conversations.map(conversation => {
			const membersInConversation = conversationMember.filter(member => member.conversationId.toString() === conversation._id.toString());
			const enrichedMembers = membersInConversation.map(member => {
				const user = members.find(user => user._id.toString() === member.memberId.toString());
				return {
					...user,
					role: member.role,
					permissions: member.permissions,
					joinedAt: member.joinedAt,
				}
			}).filter(Boolean);
			return {
				...conversation,
				memberCount: enrichedMembers.length,
				members: enrichedMembers
			}
		});
		return enrichedConversations;
	} catch (error) {
		throw error;
	}
}
const getAllConvDepartmentById = async (conversationId) => {
	try {
		const conversation = await Conversations.findOne({
			_id: conversationId,
			type: 'department'
		}).lean().exec();
		if (!conversation) throw new Error('No conversations found');

		const conversationMembers = await ConversationMember.find({
			conversationId: { $in: conversation._id }
		}).lean().exec();

		if (!conversationMembers) {
			return ({ ...conversation, members: [] });
		};
		const memberIds = conversationMembers.map(member => member.memberId);

		const members = await Users.find({ _id: { $in: memberIds } })
			.populate('name email avatar department position role')
			.lean().exec();

		if (!members) {
			return ({ ...conversation, members: [] });
		};

		const enrichedMembers = conversationMembers.map(member => {
			const user = members.find(user => user._id.toString() === member.memberId.toString());
			return {
				...user,
				role: member.role,
				permissions: member.permissions,
				joinedAt: member.joinedAt,
			}
		}).filter(Boolean);
		return {
			...conversation,
			memberCount: enrichedMembers.length,
			members: enrichedMembers
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
	transferAdminRole,
	getConvById,
	getAllConvDepartment,
	getAllConvDepartmentById
}