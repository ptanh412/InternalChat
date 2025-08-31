const Conversations = require('../models/Conversations');
const Department = require('../models/Department');
const Users = require('../models/Users');
const ConversationMember = require('../models/ConversationMember');
const socketService = require('./socketService');
const UserConvSetting = require('../models/UserConvSetting');
const Messages = require('../models/Messages');
const encryptionService = require('../utils/encryptionMsg');

const createConvDepartment = async (departmentData, creator) => {
	try {
		const department = await Department.findById(departmentData.departmentId).lean().exec();
		console.log('Department:', department);
		console.log('Department header:', department.header);

		if (!department) throw new Error('Department not found');


		const conversation = await Conversations.create({
			type: 'department',
			name: departmentData.name || department.name,
			avatarGroup: departmentData.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
			creator: creator._id,
			departmentId: department._id,
		});
		const welcomeMessage = await Messages.create({
			conversationId: conversation._id,
			content: `Welcome to ${departmentData.name || department.name}`,
			sender: department.header,
			type: 'system',
			sentAt: new Date()
		});

		await Conversations.findByIdAndUpdate(
			conversation._id,
			{ $set: 
				{ lastMessage: welcomeMessage._id }
			},
			{ new: true }
		).lean().exec();

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
			},
			unreadCount: 1
		});

		for (const deputy of deputyHeader) {
			console.log('Deputy ID:', deputy._id);

			await ConversationMember.create({
				conversationId: conversation._id,
				memberId: deputy._id,
				role: 'deputy_admin',
				permissions: {
					canChat: true,
					canAddMembers: true,
					canRemoveMembers: true,
					canEditConversation: true
				},
				unreadCount: 1
			})
		};

		for (const member of department.members) {
			console.log('Member ID:', member);


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
				},
				unreadCount: 1
			});
		};

		await Department.updateOne(
			{ _id: department._id },
			{ conversationId: conversation._id }
		)

		// await socketService.getSocket().createPersonalizedSystemmessage({
		// 	conversationId: conversation._id,
		// 	actorId: creator._id,
		// 	action: 'create_conversation',
		// 	data: { conversationName: conversation.name }
		// })

		// await socketService.getSocket().notifyDepartmentConversationCreated(conversation);

		return conversation;
	} catch (error) {
		throw error;
	}
};

const updateConvDepartment = async (conversationId, updateData, updatedBy, conversationType) => {
	console.log('Update Data:', updateData);
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
			if (updateData.addMembers && updateData.addMembers.length > 0 && !member.permissions.canAddMembers) {
				throw new Error('User does not have permission to add members');
			}
			if (updateData.removeMembers && updateData.removeMembers.length > 0 && !member.permissions.canRemoveMembers) {
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
			}
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

		// Create welcome message as the first message in the group
		const welcomeMessage = await Messages.create({
			conversationId: conversation._id,
			content: `Welcome to ${groupData.name}`,
			sender: creator._id,
			type: 'system',
			sentAt: new Date()
		});

		await Conversations.findByIdAndUpdate(
			conversation._id,
			{ $set: { lastMessage: welcomeMessage._id } },
			{ new: true }
		).lean().exec();

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
					},
					unreadCount: 1
				}
			},
			{ new: true }
		).populate('memberId', 'name').lean().exec();
		return updatedMember;
	} catch (error) {
		throw error;
	}
}

const recallDeputy = async (conversationId, currentUserId, targetUserId) => {
	try {
		const currentMember = await checkconversationPermission(conversationId, currentUserId, ['admin', 'deputy_admin']);

		if (!currentMember.permissions.canAssignDeputies) {
			throw new Error('You do not have permission to assign deputy admins');
		}

		const targetMember = await ConversationMember.findOne({
			conversationId: conversationId,
			memberId: targetUserId
		}).populate('memberId', 'name').lean().exec();

		// if (!targetMember) throw new Error('Target user is not a member of this conversation');

		// if (targetMember.role === 'admin' || targetMember.role === 'deputy_admin') {
		// 	throw new Error('Target user is already an admin or deputy admin');
		// };

		const conversation = await Conversations.findById(conversationId).lean().exec();

		const updatedMember = await ConversationMember.findOneAndUpdate(
			{ conversationId, memberId: targetUserId },
			{
				$set: {
					role: 'member',
					permissions: {
						canChat: conversation.type === 'department' ? false : true,
						canAddMembers: false,
						canRemoveMembers: false,
						canEditConversation: false,
						canAssignDeputies: false
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
		}).lean().exec();

		const conversationIds = conversationMembers.map(cm => cm.conversationId);

		const userSettings = await UserConvSetting.find({
			userId: currentUserId,
			conversationId: { $in: conversationIds }
		}).lean().exec();

		const settingsMap = {};
		userSettings.forEach(setting => {
			settingsMap[setting.conversationId.toString()] = setting;
		});

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
			})			.lean()
			.exec();
		// Decrypt lastMessage content for each conversation
		conversations.forEach(conversation => {
			if (conversation.lastMessage && conversation.lastMessage.content) {
				try {
					conversation.lastMessage.content = encryptionService.decryptMessage(
						conversation.lastMessage.content,
						conversation._id.toString()
					);
				} catch (error) {
					console.error('Error decrypting lastMessage content:', error);
					// Keep original content if decryption fails
				}
			}
			
			// Also decrypt attachment file names in lastMessage if they exist
			if (conversation.lastMessage && conversation.lastMessage.attachments && conversation.lastMessage.attachments.length > 0) {
				conversation.lastMessage.attachments = conversation.lastMessage.attachments.map(attachment => ({
					...attachment,
					fileName: attachment.fileName ? encryptionService.decryptFileName(
						attachment.fileName,
						conversation._id.toString()
					) : attachment.fileName
				}));
			}
		});

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
				}).lean();

				const userSetting = settingsMap[conversation._id.toString()] || { isPinned: false, isArchived: false };

				let otherUserCommonGroups = [];
				if (conversation.type === 'private' && enrichedMembers.length == 2) {
					const otherUser = enrichedMembers.find(m => m._id.toString() !== currentUserId.toString());
					if (otherUser){
						const otherUserConvs = await ConversationMember.find({
							memberId: otherUser._id
						}).distinct('conversationId');

						const currentUserConvs = await ConversationMember.find({
							memberId: currentUserId
						}).distinct('conversationId')

						const otherUserConvIds = otherUserConvs.map(conv => conv.toString());
						const currentUserConvIds = currentUserConvs.map(conv => conv.toString());

						const commonConvIds = otherUserConvIds.filter(id => 
							currentUserConvIds.includes(id) &&
							id !== conversation._id.toString()
						);

						if (commonConvIds.length > 0){
							const commonConvs = await Conversations.find({
								_id: { $in: commonConvIds },
								type: {$in: ['group', 'department']}
							}).select('name avatarGroup type').lean().exec();	

							otherUserCommonGroups = commonConvs
						}
					}
				}
				// console.log('Other user common groups:', otherUserCommonGroups);
				return {
					_id: userMember._id,
					conversationInfo: {
						...conversation,
						members: enrichedMembers.map(member => {
							if (conversation.type === 'private' && member._id.toString() !== currentUserId.toString()){
								return {
									...member,
									commonGroups: otherUserCommonGroups
								};
							}
							return member;
						}), // Sử dụng mảng members đã được bổ sung role và permissions
						pinned: userSetting.isPinned || false,
						archived: userSetting.isArchived || false,
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
const getUserConversations = async (userId) => {
	try {
		const conversations = await getConvById(userId);

		// Sort conversations - pinned conversations first, then by last message time
		const sortedConversations = conversations.sort((a, b) => {
			// First sort by pinned status
			if (a.conversationInfo.pinned && !b.conversationInfo.pinned) return -1;
			if (!a.conversationInfo.pinned && b.conversationInfo.pinned) return 1;

			// Then sort by last message time (newest first)
			const aTime = a.conversationInfo.lastMessage?.sentAt || a.conversationInfo.createdAt;
			const bTime = b.conversationInfo.lastMessage?.sentAt || b.conversationInfo.createdAt;
			return new Date(bTime) - new Date(aTime);
		});

		return sortedConversations;
	} catch (error) {
		console.error('Error fetching user conversations:', error);
		return res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

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

const pinConversation = async (conversationId, userId) => {
	try {
		const conversation = await Conversations.findById(conversationId).lean().exec();
		if (!conversation) throw new Error('Conversation not found');

		const member = await ConversationMember.findOne({
			conversationId: conversation._id,
			memberId: userId
		}).lean().exec();
		if (!member) throw new Error('User is not a member of this conversation');

		let settings = await UserConvSetting.findOne({
			userId,
			conversationId
		});

		if (!settings) {
			settings = await UserConvSetting.create({
				userId,
				conversationId,
				isPinned: true
			});
			await settings.save();
			return {
				success: true,
				message: 'Conversation pinned',
				isPinned: true,
				_id: conversation._id

			}
		} else {
			settings.isPinned = !settings.isPinned;
			await settings.save();

			return {
				success: true,
				message: settings.isPinned ? 'Conversation pinned' : 'Conversation unpinned',
				isPinned: settings.isPinned,
				_id: conversation._id
			}
		}

	} catch (error) {
		throw error;
	}
}

const archivedConversations = async (conversationId, userId) => {
	try {
		const conversation = await Conversations.findById(conversationId).lean().exec();
		if (!conversation) throw new Error('Conversation not found');

		const member = await ConversationMember.findOne({
			conversationId: conversation._id,
			memberId: userId
		}).lean().exec();
		if (!member) throw new Error('User is not a member of this conversation');

		let settings = await UserConvSetting.findOne({
			userId,
			conversationId
		});

		if (!settings) {
			settings = await UserConvSetting.create({
				userId,
				conversationId,
				isArchived: true
			});
			await settings.save();
			return {
				success: true,
				message: 'Conversation archived',
				isArchived: true,
				_id: conversation._id

			}
		} else {
			settings.isArchived = !settings.isArchived;
			await settings.save();
			return {
				success: true,
				message: settings.isArchived ? 'Conversation archived' : 'Conversation unarchived',
				isArchived: settings.isArchived,
				_id: conversation._id
			}
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
	recallDeputy,
	transferAdminRole,
	getConvById,
	getUserConversations,
	getAllConvDepartment,
	getAllConvDepartmentById,
	pinConversation,
	archivedConversations
}