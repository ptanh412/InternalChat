const { Server } = require('socket.io');
const socketAuth = require('../middlewares/socketAuth');
const Users = require('../models/Users');
const Typing = require('../models/Typing');
const Notifications = require('../models/Notifications');
const ConversationMember = require('../models/ConversationMember');
const Call = require('../models/Call');
const Department = require('../models/Department');
const Conversations = require('../models/Conversations');
const Messages = require('../models/Messages');
const messageService = require('../services/messageService');
const conversationService = require('../services/conversationService');
const authService = require('../services/authService');
const socketService = require('../services/socketService');
const encryptionService = require('../utils/encryptionMsg');

const setUpSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: process.env.CLIENT_URL,
			methods: ['GET', 'POST', 'PUT', 'DELETE']
		}
	});

	const userSocketMap = new Map();
	const socketUserMap = new Map();
	const userActiveConversations = new Map();
	const temporaryChats = new Map();
	const createUpdateNotification = async (user, originalValues, updateData, adminUser) => {
		// console.error('Creating update notification:', user, originalValues, updateData, adminUser);
		try {
			if (!updateData.position) return;

			const isPositionChanges = updateData.position && updateData.position !== originalValues.position;
			const isDepartmentChanges = updateData.department && (!originalValues.department || !updateData.department.equals(originalValues.department));

			if (isPositionChanges && !isDepartmentChanges && originalValues.department) {
				const department = await Department.findById(originalValues.department).select('name members').lean();

				if (department) {
					const metadata = {
						departmentName: department.name,
						oldPosition: {
							_id: user._id,
							name: user.name,
							position: originalValues.position,
						},
						newPosition: {
							_id: user._id,
							name: user.name,
							position: updateData.position,
						}
					};

					const deptNotification = await Notifications.create({
						sender: adminUser,
						departmentId: originalValues.department,
						content: `${user.name} has changed position to ${updateData.position}`,
						type: 'system_position_change',
						metadata,
						excludeUsers: [user._id]
					});

					const userNotification = await Notifications.create({
						sender: adminUser._id,
						received: user._id,
						content: `You have changed position to ${updateData.position}`,
						type: 'system',
						metadata
					})
					console.log('Notification received', userNotification);
					await notifyDepartmentMembers(department, user._id, deptNotification);
					await notifyUser(user._id, userNotification);
				}
			}
			if (isDepartmentChanges) {
				const oldDepartment = originalValues.department ?
					await Department.findById(originalValues.department).select('name members').lean() : null;
				const newDepartment = updateData.department ?
					await Department.findById(updateData.department).select('name members').lean() : null;

				if (newDepartment) {
					const metadata = {
						oldPosition: {
							_id: user._id,
							name: user.name,
							position: originalValues.position,
						},
						newPosition: {
							_id: user._id,
							name: user.name,
							position: updateData.position,
						},
						oldDepartment: oldDepartment ? {
							_id: originalValues.department,
							name: oldDepartment.name,
						} : null,
						newDepartment: {
							_id: updateData.department,
							name: newDepartment.name,
						}
					}

					const newDeptNotification = await Notifications.create({
						sender: adminUser._id,
						departmentId: newDepartment._id,
						content: `${user.name} has been moved to ${newDepartment.name}`,
						type: 'system_member_joined',
						metadata,
						excludeUsers: [user._id]
					})

					const userNotification = await Notifications.create({
						sender: adminUser._id,
						received: user._id,
						content: `You have been move to ${newDepartment.name}`,
						type: 'system',
						metadata
					});

					await notifyDepartmentMembers(newDepartment, user._id, newDeptNotification);
					await notifyUser(user._id, userNotification);
				}
				if (oldDepartment) {
					const oldDeptmetadata = {
						oldPosition: {
							_id: user._id,
							name: user.name,
							position: originalValues.position,
						},
						newPosition: {
							_id: user._id,
							name: user.name,
							position: updateData.position || originalValues.position,
						},
						oldDepartment: {
							_id: originalValues.department,
							name: oldDepartment.name,
						},
						newDepartment: newDepartment ? {
							_id: updateData.department,
							name: newDepartment.name,
						} : null
					}

					const oldDeptNotification = await Notifications.create({
						sender: adminUser._id,
						departmentId: originalValues.department,
						content: `${user.name} has been removed from ${oldDepartment.name}`,
						type: 'system_member_removed',
						metadata: oldDeptmetadata,
						excludeUsers: [user._id]
					});

					await notifyDepartmentMembers(oldDepartment, user._id, oldDeptNotification);
				}

			}
		} catch (error) {
			console.error('Error creating update notification:', error.message);
			throw new Error('Failed to create update notification');
		}
	};

	const notifyDepartmentMembers = async (department, excludeUserId, notification) => {
		// console.error('Notifying department members:', department, excludeUserId, notification);
		try {
			// Populate the sender information first
			const populatedNotification = await Notifications.findById(notification._id)
				.populate('sender', 'name avatar _id')
				.lean();

			for (const memberId of department.members) {
				if (memberId.equals(excludeUserId)) {
					continue;
				}

				const socketId = userSocketMap.get(memberId.toString());
				// console.log('Socket ID notifyDepartmentMembers:', socketId);
				if (socketId) {
					io.to(socketId).emit('notification:new', {
						...populatedNotification,
						received: memberId
					});
				}
			}
		} catch (error) {
			console.error('Error notifying department members:', error.message);
		}
	};

	const notifyUser = async (userId, notification) => {
		// console.error('Notifying user:', userId, notification);
		try {
			// Populate the sender information first
			const populatedNotification = await Notifications.findById(notification._id)
				.populate('sender', 'name avatar _id')
				.lean();

			const socketId = userSocketMap.get(userId.toString());
			//   console.log('Socket ID notifyUser:', socketId);
			if (socketId) {
				io.to(socketId).emit('notification:new', populatedNotification);
			}
		} catch (error) {
			console.error('Error notifying user:', error.message);
		}
	};
	const notifyUserUpdate = async (updatedUser) => {
		try {
			io.emit('user:update', {
				userId: updatedUser._id,
				updateData: updatedUser
			})
		} catch (error) {
			console.error('Error notifying user update', error);
		}
	};

	const emitRoleUpdate = async (data) => {
		// console.log('Emitting role update:', data);
		const { userId, oldDepartmentId, newDepartmentId, oldPosition, newPosition, adminId } = data;
		try {
			const user = await Users.findById(userId)
				.select('name avatar status department position')
				.populate('department', 'name').lean().exec();
			const admin = adminId ? await Users.findById(adminId).select('name').lean().exec() : null;

			if (oldDepartmentId && newDepartmentId && oldDepartmentId.toString() === newDepartmentId.toString()) {
				const department = await Department.findById(oldDepartmentId)
					.populate('header', 'name avatar status')
					.populate('deputyHeader', 'name avatar status')
					.lean().exec();

				if (!department) return;

				let actionType = '';
				let updatedUser = null;

				if (newPosition === 'Department Head') {
					actionType = 'header_assigned';
					updatedUser = { ...user, role: 'admin' };
				} else if (newPosition === 'Deputy Department') {
					actionType = 'deputy_assigned';
					updatedUser = { ...user, role: 'deputy_admin' };
				} else if (oldPosition === 'Department Head') {
					actionType = 'header_removed';
					updatedUser = { ...user, role: 'member' };
				} else if (oldPosition === 'Deputy Department') {
					actionType = 'deputy_removed';
					updatedUser = { ...user, role: 'member' };
				}

				const systemMessage = await Messages.create({
					conversationId: department.conversationId,
					sender: adminId,
					type: 'system',
					content: `${admin.name} updated ${user.name}'s role`,
					metadata: {
						action: actionType,
						department: {
							_id: department._id,
							name: department.name
						},
						userChange: {
							_id: user._id,
							name: user.name,
							avatar: user.avatar,
						},
						oldPosition: oldPosition,
						newPosition: newPosition,
						changedBy: admin ? {
							_id: admin._id,
							name: admin.name
						} : null
					}
				});

				await Conversations.findByIdAndUpdate(department.conversationId, {
					lastMessage: systemMessage._id
				});

				const populatedMessage = await Messages.findById(systemMessage._id)
					.populate('sender', 'name avatar status')
					.lean().exec();

				const members = await ConversationMember.find({
					conversationId: department.conversationId
				}).populate({
					path: 'memberId',
					select: 'name avatar status department position',
					populate: {
						path: 'department',
						select: 'name'
					}
				}).lean().exec();

				const enrichedMembers = members.map(member => {
					const memberData = {
						...member.memberId,
						role: member.role,
						permissions: member.permissions
					};
					return memberData;
				});

				const convIdString = department.conversationId.toString();

				const updateData = {
					conversationId: department.conversationId,
					members: enrichedMembers,
					lastMessage: populatedMessage,
					unreadCount: 0
				};

				if (actionType === 'header_assigned') {
					updateData.newAdmin = updatedUser;
				} else if (actionType === 'deputy_assigned') {
					updateData.newDeputy = updatedUser;
				}

				io.to(convIdString).emit('chat:update', {
					type: 'update_members',
					data: updateData
				});

				io.emit('chat:update', {
					type: 'update_members',
					data: updateData
				})
				for (const member of members) {
					const memberIdString = member.memberId._id.toString();
					const memberSocketId = userSocketMap.get(memberIdString);

					const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

					if (!isInRoom && memberSocketId) {
						await ConversationMember.findOneAndUpdate(
							{
								conversationId: department.conversationId,
								memberId: member.memberId._id
							},
							{ $inc: { unreadCount: 1 } }
						)
						io.to(memberSocketId).emit('chat:update', {
							type: 'update_members',
							data: {
								...updateData,
								unreadCount: 1,
								isIncrement: true
							}
						});
					}
				}
			} else {
				if (oldDepartmentId) {
					const oldDepartment = await Department.findById(oldDepartmentId).lean().exec();
					if (oldDepartment) {
						const removalMessage = await Messages.create({
							conversationId: oldDepartment.conversationId,
							sender: adminId,
							type: 'system',
							content: `${admin.name} removed ${user.name} from the department`,
							metadata: {
								action: 'member_removed',
								department: {
									_id: oldDepartment._id,
									name: oldDepartment.name
								},
								userChange: {
									_id: user._id,
									name: user.name,
									avatar: user.avatar,
								},
								previousRole: oldPosition,
								changedBy: admin ? {
									_id: admin._id,
									name: admin.name
								} : null,
								removedBy: {
									_id: adminId,
									name: admin.name
								},
								removedMembers: [{
									_id: user._id,
									name: user.name,
									avatar: user.avatar,
								}]
							}
						});

						await Conversations.findByIdAndUpdate(oldDepartment.conversationId, {
							lastMessage: removalMessage._id
						});

						const populatedMessage = await Messages.findById(removalMessage._id)
							.populate('sender', 'name avatar status')
							.lean().exec();
						const oldMembers = await ConversationMember.find({
							conversationId: oldDepartment.conversationId
						}).populate({
							path: 'memberId',
							select: 'name avatar status department position',
							populate: {
								path: 'department',
								select: 'name'
							}
						}).lean().exec();

						const enrichedOldMembers = oldMembers.map(member => {
							const memberData = {
								...member.memberId,
								role: member.role,
								permissions: member.permissions
							};
							return memberData;
						});

						const oldConvIdString = oldDepartment.conversationId.toString();
						io.emit('chat:update', {
							type: 'update_members',
							data: {
								conversationId: oldDepartment.conversationId,
								members: enrichedOldMembers,
								lastMessage: populatedMessage,
								unreadCount: 0,
								removedMember: {
									_id: user._id,
									name: user.name
								}
							}
						});

						for (const member of oldMembers) {
							const memberIdString = member.memberId._id.toString();
							const memberSocketId = userSocketMap.get(memberIdString);

							const isInRoom = isUserActiveInConversation(memberIdString, oldConvIdString);

							if (!isInRoom && memberSocketId) {
								await ConversationMember.findOneAndUpdate(
									{
										conversationId: oldDepartment.conversationId,
										memberId: member.memberId._id
									},
									{ $inc: { unreadCount: 1 } }
								)
								io.to(memberSocketId).emit('chat:update', {
									type: 'update_members',
									data: {
										conversationId: oldDepartment.conversationId,
										members: enrichedOldMembers,
										lastMessage: populatedMessage,
										unreadCount: 1,
										isIncrement: true,
										removedMember: {
											_id: user._id,
											name: user.name
										}
									},
									sourceAction: 'role_update'
								});
							}
						}
					}
				}
				if (newDepartmentId) {
					const newDepartment = await Department.findById(newDepartmentId).lean().exec();
					if (!newDepartment) return;

					let conversationId = newDepartment.conversationId;
					if (!conversationId) {
						const newConversation = await Conversations.create({
							type: 'department',
							name: newDepartment.name,
							creator: adminId,
							departmentId: newDepartmentId,
						});
						conversationId = newConversation._id;
						await Department.findByIdAndUpdate(newDepartmentId, {
							conversationId: conversationId,
							updatedAt: new Date()
						});
					}
					let actionType = 'member_added';
					let updateUser = { ...user, role: 'member' };

					if (newPosition === 'Department Head') {
						actionType = 'header_assigned';
						updateUser = { ...user, role: 'admin' };
					} else if (newPosition === 'Deputy Department') {
						actionType = 'deputy_assigned';
						updateUser = { ...user, role: 'deputy_admin' };
					}

					const additionMessage = await Messages.create({
						conversationId: conversationId,
						sender: adminId,
						type: 'system',
						content: `${admin.name} added ${user.name} to the department`,
						metadata: {
							action: actionType,
							department: {
								_id: newDepartment._id,
								name: newDepartment.name
							},
							userChange: {
								_id: user._id,
								name: user.name,
								avatar: user.avatar,
							},
							newRole: newPosition,
							changedBy: admin ? {
								_id: admin._id,
								name: admin.name
							} : null
						}
					});

					await Conversations.findByIdAndUpdate(conversationId, {
						lastMessage: additionMessage._id
					});

					const populatedMessage = await Messages.findById(additionMessage._id)
						.populate('sender', 'name avatar status')
						.lean().exec();
					const newMembers = await ConversationMember.find({
						conversationId: conversationId
					}).populate({
						path: 'memberId',
						select: 'name avatar status department position',
						populate: {
							path: 'department',
							select: 'name'
						}
					}).lean().exec();

					const enrichedNewMembers = newMembers.map(member => {
						const memberData = {
							...member.memberId,
							role: member.role,
							permissions: member.permissions
						};
						return memberData;
					});

					const newConvIdString = conversationId.toString();

					const updateData = {
						conversationId: conversationId,
						name: newDepartment.name,
						avatarGroup: '',
						members: enrichedNewMembers,
						lastMessage: populatedMessage,
						unreadCount: 0,
						sourceAction: 'role_update'
					}

					if (actionType === 'header_assigned') {
						updateData.newAdmin = updateUser;
					} else if (actionType === 'deputy_assigned') {
						updateData.newDeputy = updateUser;
					} else {
						updateData.newMember = updateUser;
					};

					io.emit('chat:update', {
						type: 'update_members',
						data: updateData
					});

					for (const member of newMembers) {
						const memberIdString = member.memberId._id.toString();
						const memberSocketId = userSocketMap.get(memberIdString);

						const isInRoom = isUserActiveInConversation(memberIdString, newConvIdString);

						if (!isInRoom && memberSocketId) {
							await ConversationMember.findOneAndUpdate(
								{
									conversationId: conversationId,
									memberId: member.memberId._id
								},
								{ $inc: { unreadCount: 1 } }
							)
							io.to(memberSocketId).emit('chat:update', {
								type: 'update_members',
								data: {
									...updateData,
									unreadCount: 1,
									isIncrement: true
								}
							});
						}
					}
				}
			}
		} catch (error) {
			console.error('Error updating user role', error);
		}
	}

	const toggleActive = async (data) => {
		console.log('Toggle active event received:', data);
		try {
			let userId, isActive;
			if (data && typeof data === 'object') {
				if (data.userId) {
					userId = data.userId;
					isActive = data.isActive;
				} else {
					userId = Object.keys(data)[0];
					isActive = data[userId];
				}
			} else {
				userId = data;
			}
			if (!userId) return;
			const userIdString = userId.toString ? userId.toString() : String(userId);
			const socketId = userSocketMap.get(userIdString);
			console.log('Socket ID toggleActive:', socketId);
			const message = isActive
				? 'Your account has been activated. You can log in now.'
				: 'Your account has been deactivated. Please contact the administrator.';
			io.to(socketId).emit('account:deactivated', {
				userId: userIdString,
				active: isActive,
				message: message
			});		} catch (error) {
			console.error('Error toggling user active status', error);
		}
	}

	const logCallSystemMessage = async (call) => {
		try {
			let content = '';
			const durationMinutes = call.duration ? Math.floor(call.duration / 60) : 0;
			const durationSeconds = call.duration ? call.duration % 60 : 0;
			const durationString = call.duration ? `${durationMinutes > 0 ? durationMinutes + 'm' : ''}${durationSeconds}s` : '0s';

			switch (call.status) {
				case 'completed':
					content = `Call ended. Duration: ${durationString}`;
					break;
				case 'missed':
					content = `Missed ${call.type} call.`;
					break;
				case 'declined':
					content = 'Call was declined.';
					break;
				case 'failed':
					content = 'Call failed.';
					break;
				default:
					content = `Call finished with status: ${call.status}`;
			}			
			
			const systemMessage = new Messages({
				conversationId: call.conversationId,
				sender: call.initiator,
				content: content,
				type: 'system',
				metadata: {
					callId: call._id,
					status: call.status,
					type: call.type,
					duration: call.duration,
					participants: call.participants.map(p => ({ user: p.user.toString(), status: p.status })),
					action: call.status === 'completed' ? 'call_ended' : 'call_missed'
				}
			});
			await systemMessage.save();

			await Conversations.findByIdAndUpdate(call.conversationId, {
				lastMessage: systemMessage._id,
				updatedAt: new Date()
			});

			// Populate the system message with sender info before emitting
			const populatedSystemMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean()
				.exec();

			// Emit to conversation room for active users
			io.to(call.conversationId.toString()).emit('message:new', populatedSystemMessage);

			// For ended or missed calls, emit lastMessage update to all participants immediately
			if (call.status === 'completed' || call.status === 'missed') {
				const conversationMembers = await ConversationMember.find({
					conversationId: call.conversationId
				}).lean().exec();

				const convIdString = call.conversationId.toString();

				for (const member of conversationMembers) {
					const memberIdString = member.memberId.toString();
					const memberSocketId = userSocketMap.get(memberIdString);

					if (memberSocketId) {
						// Check if user is actively in this conversation
						const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

						if (!isInRoom) {
							// If user is not in the conversation room, increment unread count
							await ConversationMember.findOneAndUpdate(
								{
									conversationId: call.conversationId,
									memberId: member.memberId
								},
								{ $inc: { unreadCount: 1 } }
							);

							// Emit chat update with lastMessage and unread count
							io.to(memberSocketId).emit('chat:update', {
								type: 'last_message_update',
								data: {
									conversationId: call.conversationId,
									lastMessage: populatedSystemMessage,
									unreadCount: 1,
									isIncrement: true
								}
							});
						} else {
							// If user is in the conversation room, just update lastMessage without unread count
							io.to(memberSocketId).emit('chat:update', {
								type: 'last_message_update',
								data: {
									conversationId: call.conversationId,
									lastMessage: populatedSystemMessage,
									unreadCount: 0
								}
							});
						}
					}
				}
			}
		} catch (error) {
			console.error('Error logging call system message:', error);
		}
	}

	const helpers = {
		createUpdateNotification,
		notifyDepartmentMembers,		
		notifyUser,
		notifyUserUpdate,
		emitRoleUpdate,
		toggleActive,
		logCallSystemMessage
	}

	socketService.setSocketInstance(null, io, helpers);

	io.use(socketAuth);
	io.on('connection', async (socket) => {
		console.log(`User connected: ${socket.userId}`);

		await Users.findByIdAndUpdate(socket.userId, {
			status: 'online',
			lastActive: new Date()
		},
			{ new: true }
		);

		console.log("User connected, userId:", socket.userId, "socketId:", socket.id);
		userSocketMap.set(socket.userId.toString(), socket.id);
		console.log("userSocketMap after connection:", userSocketMap);
		socketUserMap.set(socket.id, socket.userId.toString());
		const unreadCount = await Notifications.countDocuments({
			received: socket.userId,
			isRead: false
		});
		io.emit('user:status', {
			userId: socket.userId,
			status: 'online'
		});

		socket.on('get:user-status', async () => {
			try {
				const onlineUsers = await Users.find(
					{ status: 'online' },
					{ _id: 1, status: 1 }
				);

				socket.emit('user:status-bulk',
					onlineUsers.map(user => ({
						userId: user._id,
						status: user.status
					}))
				);
			} catch (error) {
				console.error('Error getting user status', error);
			}
		});

		socket.on('user:update', async (data) => {
			console.log('User update event received:', data);
			try {
				const { userId, updateData } = data;
				const allowedFields = ['name', 'avatar', 'phoneNumber', 'email'];
				const filteredUpdateData = {};

				allowedFields.forEach(field => {
					if (updateData[field] !== undefined) {
						filteredUpdateData[field] = updateData[field];
					}
				});

				await authService.updateUser(userId, filteredUpdateData);
				io.emit('user:updated', {
					userId,
					updateFields: filteredUpdateData
				});

				socket.emit('user:updated', {
					userId,
					updateFields: filteredUpdateData
				})
			} catch (error) {
				console.error('Error updating user', error);
			}
		})

		socket.emit('notification:count', { count: unreadCount });

		socket.on('notification:read', async (data) => {
			try {
				if (data.notificationId) {
					await Notifications.findByIdAndUpdate(
						{ _id: data.notificationId, received: socket.userId },
						{ isRead: true }
					)
				} else {
					await Notifications.updateMany(
						{ received: socket.userId, isRead: false },
						{ isRead: true }
					)
				}

				const newCount = await Notifications.countDocuments({
					received: socket.userId,
					isRead: false
				});

				socket.emit('notification:count', { count: newCount });
			} catch {
				console.error('Error marking notification as read', error);
			}
		})

		socket.on('chat:init', async (data) => {
			// console.log('Received chat:init event:', data);
			const { contactId, conversationType, conversationInfo } = data;
			const initiatorId = socket.userId;
			try {
				let existingConversation;

				if (conversationType === 'private') {
					if (conversationInfo && conversationInfo._id) {
						existingConversation = await Conversations.findById(conversationInfo._id)
							.populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status')
							.lean().exec();
					}

					if (!existingConversation) {
						const initiatorConvs = await ConversationMember.find({
							memberId: initiatorId
						}).select('conversationId').populate(
							'memberId',
							'name avatar status department position email phoneNumber'
						).lean().exec();

						const initiatorConvIds = initiatorConvs.map(conv => conv.conversationId);

						const contactMemberships = await ConversationMember.find({
							memberId: contactId,
							conversationId: { $in: initiatorConvIds }
						}).populate(
							'memberId',
							'name avatar status department position email phoneNumber'
						).lean().exec();

						const sharedConvIds = contactMemberships.map(m => m.conversationId);

						existingConversation = await Conversations.findOne({
							_id: { $in: sharedConvIds },
							type: 'private',
						}).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status').lean().exec();
						console.log('Existing conversation found:', existingConversation);
					}
				} else if (conversationType === 'group' || conversationType === 'department') {
					existingConversation = await Conversations.findOne({
						_id: contactId,
						type: conversationType
					}).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status').lean().exec();
				}

				if (existingConversation) {
					// console.log('Existing conversation found:', existingConversation);
					const members = await ConversationMember.find({
						conversationId: existingConversation._id
					}).populate({
						path: 'memberId',
						select: 'name avatar status department position email phoneNumber',
						populate: [{
							path: 'department',
							select: 'name'
						},
						{
							path: 'role',
							select: 'permissions',
							populate: {
								path: 'permissions',
								select: 'createGroup createDepartment manageDepartment manageUsers'
							}
						},
						{
							path: 'customPermissions',
							select: 'createGroup createDepartment manageDepartment manageUsers'
						}
						]
					}).lean().exec();
					const enrichedMembers = members.map(member => {
						// Tạo đối tượng user từ memberId và bổ sung thêm role và permissions
						const memberData = {
							...member.memberId,  // Giữ nguyên thông tin user (name, avatar, position, status, department)
							role: member.role,
							permissions: member.permissions
						};
						let systemPermissions = null;

						if (member.memberId.customPermissions) {
							systemPermissions = member.memberId.customPermissions;
						} else if (member.memberId.role && member.memberId.role.permissions) {
							systemPermissions = member.memberId.role.permissions;
						}

						if (systemPermissions) {
							memberData.permissionSystem = {
								createGroup: systemPermissions.createGroup,
								createDepartment: systemPermissions.createDepartment,
								manageDepartment: systemPermissions.manageDepartment,
								manageUsers: systemPermissions.manageUsers
							};
						}
						return memberData;
					});
					let otherUserCommonGroups = [];

					if (existingConversation.type === 'private' && enrichedMembers.length == 2) {
						const otherUser = enrichedMembers.find(m => m._id.toString() !== initiatorId.toString());
						if (otherUser) {
							const otherUserConv = await ConversationMember.find({
								memberId: otherUser._id,
							}).distinct('conversationId');
							const currentUserConvs = await ConversationMember.find({
								memberId: initiatorId
							}).distinct('conversationId');

							const otherUserConvIds = otherUserConv.map(conv => conv.toString());
							const currentUserConvIds = currentUserConvs.map(conv => conv.toString());

							const commonConvIds = otherUserConvIds.filter(id =>
								currentUserConvIds.includes(id) &&
								id !== existingConversation._id.toString()
							);

							if (commonConvIds.length > 0) {
								otherUserCommonGroups = await Conversations.find({
									_id: { $in: commonConvIds },
									type: { $in: ['group', 'department'] }
								}).select('name type avatarGroup').lean().exec();
							}
						}
					}

					const enrichiedMembersForClient = enrichedMembers.map(member => {
						const memberData = {
							...member,
						};

						if (existingConversation.type === 'private' && enrichedMembers.length == 2) {
							memberData.commonGroups = otherUserCommonGroups;
						};
						return memberData;
					})

					if (existingConversation.lastMessage) {
						// Ensure lastMessage.sender is populated with user info
						const lastMessage = await Messages.findById(existingConversation.lastMessage._id)
							.populate([{
								path: 'sender',
								select: 'name avatar status'
							},
							{
								path: 'attachments',
								select: 'fileName fileUrl fileType mimeType fileSize',
							}
							])
							.lean()
							.exec();

						if (lastMessage) {
							// Giải mã nội dung tin nhắn cuối
							lastMessage.content = encryptionService.decryptMessage(
								lastMessage.content,
								existingConversation._id.toString()
							);

							// Giải mã tên file nếu có attachments
							if (lastMessage.attachments && lastMessage.attachments.length > 0) {
								lastMessage.attachments = lastMessage.attachments.map(attachment => ({
									...attachment,
									fileName: encryptionService.decryptFileName(
										attachment.fileName,
										existingConversation._id.toString()
									)
								}));
							}

							existingConversation.lastMessage = lastMessage;
						} else {
							existingConversation.lastMessage = null;
						}
					}

					const conversationData = existingConversation;

					const populatedConversation = {
						...conversationData,
						members: enrichiedMembersForClient
					};
					// console.log('Existing conversation:', populatedConversation);
					socket.emit('chat:loaded', {
						conversation: populatedConversation,
						isTemporary: false
					});
					return;
				}				if (conversationType === 'private') {
					const contactUser = await Users.findById(contactId)
						.select('name avatar status department email position phoneNumber')
						.populate({
							path: 'department',
							select: 'name'
						})
						.lean().exec();

					if (!contactUser) {
						return socket.emit('chat:error', {
							error: 'User not found'
						});
					}
					//select name of depar
					const initiatorUser = await Users.findById(initiatorId)
						.select('name avatar status department email position phoneNumber')
						.populate({
							path: 'department',
							select: 'name'
						})
						.lean().exec();
					const tempChatId = `temp_${initiatorId}_${contactId}`;

					temporaryChats.set(tempChatId, {
						initiatorId,
						contactId,
						createdAt: new Date()
					});

					socket.emit('chat:loaded', {
						conversation: {
							_id: tempChatId,
							type: 'private',
							creator: initiatorId,
							members: [initiatorUser, contactUser],
							isVisible: true,
							isTemporary: true
						},
					});

				} else if (conversationType === 'group' || conversationType === 'department') {
					const conversation = await Conversations.findById(contactId)
						.populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status').lean().exec();
					console.log('Group or department conversation found:', conversation);

					if (conversation.lastMessage) {
						await Messages.populate(conversation.lastMessage, {
							path: 'sender',
							select: 'name status'
						});

						// Giải mã nội dung tin nhắn cuối
						conversation.lastMessage.content = encryptionService.decryptMessage(
							conversation.lastMessage.content,
							conversation._id.toString()
						);
					}

					const members = await ConversationMember.find({
						conversationId: conversation._id
					}).populate({
						path: 'memberId',
						select: 'name avatar status department position',
						populate: [
							{
								path: 'department',
								select: 'name'
							},
							{
								path: 'role',
								select: 'permissions',
								populate: {
									path: 'permissions',
									select: 'createGroup createDepartment manageDepartment manageUsers'
								}
							},
							{
								path: 'customPermissions',
								select: 'createGroup createDepartment manageDepartment manageUsers'
							}
						]
					}).lean().exec();

					const enrichedMembers = members.map(member => {
						// Tạo đối tượng user từ memberId và bổ sung thêm role và permissions
						const memberData = {
							...member.memberId,  // Giữ nguyên thông tin user (name, avatar, position, status, department)
							role: member.role,
							permissions: member.permissions
						};

						// Thêm permissionSystem từ role hoặc customPermissions
						let systemPermissions = null;
						if (member.memberId.customPermissions) {
							// Ưu tiên customPermissions nếu có
							systemPermissions = member.memberId.customPermissions;
						} else if (member.memberId.role && member.memberId.role.permissions) {
							// Sử dụng permissions từ role nếu không có customPermissions
							systemPermissions = member.memberId.role.permissions;
						}

						if (systemPermissions) {
							memberData.permissionSystem = {
								name: systemPermissions.name,
								createGroup: systemPermissions.createGroup || false,
								createDepartment: systemPermissions.createDepartment || false,
								manageDepartment: systemPermissions.manageDepartment || false,
								manageUsers: systemPermissions.manageUsers || false
							};
						}

						return memberData;
					});

					const populatedConversation = {
						...conversation.toObject(),
						members: enrichedMembers
					}

					socket.emit('chat:loaded', {
						conversation: populatedConversation,
						isTemporary: false
					})
				}
			} catch (error) {
				console.error('Error initializing chat', error);
				socket.emit('chat:error', {
					error: error.message
				});
			}
		})
		socket.on('create:conversation-group', async (data) => {
			console.log('Received create group event:', data);
			const { conversationName, members, type, creator } = data;
			try {
				const creatorObj = { _id: creator };

				const groupData = {
					type: type || 'group',
					name: conversationName,
					members: members,
				}
				const createdConversation = await conversationService.createConvGroup(groupData, creatorObj);
				console.log('Created group conversation:', createdConversation);

				// Fetch properly populated member data with roles and permissions
				const conversationMembers = await ConversationMember.find({
					conversationId: createdConversation._id
				}).populate({
					path: 'memberId',
					select: 'name avatar status department position',
					populate: [
						{
							path: 'department',
							select: 'name'
						},
						{
							path: 'role',
							select: 'permissions',
							populate: {
								path: 'permissions',
								select: 'createGroup createDepartment manageDepartment manageUsers'
							}
						},
						{
							path: 'customPermissions',
							select: 'createGroup createDepartment manageDepartment manageUsers'
						}
					]
				}).lean().exec();

				const enrichedMembers = conversationMembers.map(member => {
					// Create member data with proper role and permissions
					const memberData = {
						...member.memberId,  // Keep user info (name, avatar, position, status, department)
						role: member.role,
						permissions: member.permissions
					};

					// Add permissionSystem from role or customPermissions
					let systemPermissions = null;
					if (member.memberId.customPermissions) {
						// Prioritize customPermissions if available
						systemPermissions = member.memberId.customPermissions;
					} else if (member.memberId.role && member.memberId.role.permissions) {
						// Use permissions from role if no customPermissions
						systemPermissions = member.memberId.role.permissions;
					}

					if (systemPermissions) {
						memberData.permissionSystem = {
							name: systemPermissions.name,
							createGroup: systemPermissions.createGroup || false,
							createDepartment: systemPermissions.createDepartment || false,
							manageDepartment: systemPermissions.manageDepartment || false,
							manageUsers: systemPermissions.manageUsers || false
						};
					}

					return memberData;
				});

				const formattedConv = {
					_id: createdConversation._id.toString(),
					conversationInfo: {
						_id: createdConversation._id.toString(),
						type: createdConversation.type,
						name: conversationName,
						avatarGroup: createdConversation.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
						members: enrichedMembers,
						lastMessage: createdConversation.lastMessage || {
							content: `Welcome to ${conversationName}`,
							type: 'system',
							sentAt: new Date(),
							sender: creatorObj._id,
						},
					},
					newConversation: {
						...createdConversation.toObject(),
						members: enrichedMembers,
						creator: creator
					},
					creatorId: creator,
				}
				for (const member of members) {
					if (member.toString() !== creator.toString()) {
						const memberSocketId = userSocketMap.get(member.toString());
						if (memberSocketId) {
							io.to(memberSocketId).emit('group:created', {
								...formattedConv,
								unreadCount: 1
							});
						}
					}
				}
				const creatorSocketId = userSocketMap.get(creator.toString());
				if (creatorSocketId) {
					io.to(creatorSocketId).emit('group:created', {
						...formattedConv,
						unreadCount: 0
					});
				}

			} catch (error) {
				console.error('Error creating group conversation', error);
			}
		});
		socket.on('create:conversation-department', async (data) => {
			console.log('Received create department event:', data);
			const { departmentId, name, creator } = data;
			try {
				const creatorObj = { _id: creator };

				const departmentData = {
					departmentId,
					name,
					avatarGroup: ''
				};

				const createdConversation = await conversationService.createConvDepartment(departmentData, creatorObj);
				const department = await Department.findById(departmentId).populate('members').lean().exec();
				if (!department) throw new Error('Department not found');

				const allMembers = [...department.members];
				if (department.header) allMembers.push(department.header._id);

				const convMembers = await ConversationMember.find({
					conversationId: createdConversation._id
				})
					.populate('memberId', 'name avatar status department position')
					.lean().exec();

				const formattedConv = {
					_id: createdConversation._id.toString(),
					conversationInfo: {
						_id: createdConversation._id.toString(),
						type: createdConversation.type,
						name: createdConversation.name,
						members: convMembers.map(m => ({
							_id: m.memberId._id,
							role: m.role,
							permissions: m.permissions
						})),
						lastMessage: createdConversation.lastMessage || {
							content: `Welcome to ${createdConversation.name}`,
							type: 'system',
							sentAt: new Date(),
						},
					},
					newConversation: {
						...createdConversation.toObject(),
						members: convMembers.map(m => ({
							_id: m.memberId._id,
							role: m.role,
							permissions: m.permissions
						})),
						creator: creator
					},
					creatorId: creator,
				}
				for (const member of allMembers) {
					const memberId = member.toString();
					const memberSocketId = userSocketMap.get(memberId);

					if (memberSocketId) {
						io.to(memberSocketId).emit('group:created', {
							...formattedConv,
							unreadCount: 1
						});
					}
				}
				const creatorSocketId = userSocketMap.get(creator.toString());
				if (creatorSocketId) {
					io.to(creatorSocketId).emit('group:created', {
						...formattedConv,
						unreadCount: 1
					});
				}
			} catch (error) {
				console.error('Error creating group conversation', error);
			}
		});

		socket.on('group:update-info', async (data) => {
			console.log('Received update info group:', data);
			const { conversationId, updateData, updatedBy, conversationType } = data;
			const updatedConv = await conversationService.updateConvDepartment(conversationId, updateData, updatedBy, conversationType);

			const members = await ConversationMember.find({
				conversationId: updatedConv._id
			})
				.populate({
					path: 'memberId',
					select: 'name avatar status department position',
					populate: {
						path: 'department',
						select: 'name' // Assuming your Department model has a 'name' field
					}
				})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions
				};
				return memberData;
			})

			const systemMessage = await Messages.create({
				conversationId: updatedConv._id,
				sender: updatedBy._id,
				type: 'system',
				content: updateData.name ? `${updatedBy.name} changed group name to ${updateData.name}` : `${updatedBy.name} changed group avatar`,
				metadata: {
					action: 'group_info_updated',
					updatedBy: {
						_id: updatedBy._id,
						name: updatedBy.name
					},
					groupInfo: updateData
				}
			});
			await Conversations.findByIdAndUpdate(conversationId, {
				lastMessage: systemMessage._id
			});

			const populatedMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean().exec();

			const convIdString = conversationId.toString();
			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				if (memberIdString === updatedBy._id.toString()) continue;

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: updatedConv._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)
					if (memberSocketId) {
						io.to(memberSocketId).emit('chat:update', {
							type: 'update_group_info',
							data: {
								conversationId,
								name: updateData.name,
								avatarGroup: updateData.avatarGroup,
								members: enrichedMembers,
								updatedBy,
								conversationType,
								lastMessage: populatedMessage,
								unreadCount: 1,
								isIncrement: true
							}
						});
					}
				}
			};
			socket.to(conversationId).emit('chat:update', {
				type: 'update_group_info',
				data: {
					conversationId,
					name: updateData.name,
					avatarGroup: updateData.avatarGroup,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});
			socket.emit('chat:update', {
				type: 'update_group_info',
				data: {
					conversationId,
					name: updateData.name,
					avatarGroup: updateData.avatarGroup,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			})
		})

		socket.on('group:add-member', async (data) => {
			console.log('Received add member event:', data);
			const { conversationId, conversationType, updatedBy, newMembers } = data;

			const updateData = {
				addMembers: newMembers
			}

			const updatedConv = await conversationService.updateConvDepartment(conversationId, updateData, updatedBy, conversationType);

			const members = await ConversationMember.find({
				conversationId: updatedConv._id
			})
				.populate({
					path: 'memberId',
					select: 'name avatar status department position',
					populate: {
						path: 'department',
						select: 'name' // Assuming your Department model has a 'name' field
					}
				})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions,
					joinedAt: member.joinedAt
				};
				return memberData;
			})

			const addMembers = await Users.find({
				_id: { $in: newMembers }
			}).select('name avatar status department position').populate('department', 'name').lean().exec();

			const systemMessage = await Messages.create({
				conversationId: updatedConv._id,
				sender: updatedBy._id,
				type: 'system',
				content: `${updatedBy.name} added members to the group`,
				metadata: {
					action: 'member_added',
					addedBy: {
						_id: updatedBy._id,
						name: updatedBy.name
					},
					addedMembers: addMembers.map(member => ({
						_id: member._id,
						name: member.name,
						avatar: member.avatar,
						department: member.department.name,
						position: member.position
					}))
				}
			})
			await Conversations.findByIdAndUpdate(conversationId, {
				lastMessage: systemMessage._id
			});
			const populatedMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean().exec();

			const fullConv = await Conversations.findById(conversationId)
				.populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status')
				.populate('creator', 'name avatar')
				.lean().exec();

			const convIdString = conversationId.toString();
			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				if (memberIdString === updatedBy._id.toString()) continue;

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: updatedConv._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)
					if (memberSocketId) {
						io.to(memberSocketId).emit('chat:update', {
							type: 'update_members',
							data: {
								conversationId,
								members: enrichedMembers,
								updatedBy,
								conversationType,
								lastMessage: populatedMessage,
								unreadCount: 1,
								isIncrement: true
							}
						});
					}
				}
			}
			socket.to(conversationId).emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			socket.emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});
			for (const newMemberId of newMembers) {
				const newMemberSocketId = userSocketMap.get(newMemberId.toString());

				if (newMemberSocketId) {
					io.to(newMemberSocketId).emit('group:added', {
						conversationId,
						conversation: {
							conversationInfo: {
								...fullConv,
								lastMessage: populatedMessage
							},
							members: enrichedMembers,
							unreadCount: 1,
							isIncrement: true
						}
					});
				}
			}
		});

		socket.on('group:remove-member', async (data) => {
			const { conversationId, conversationType, updatedBy, membersToRemove } = data;
			const updateData = {
				removeMembers: membersToRemove
			}

			const updatedConv = await conversationService.updateConvDepartment(conversationId, updateData, updatedBy, conversationType);

			const members = await ConversationMember.find({
				conversationId: updatedConv._id
			})
				.populate({
					path: 'memberId',
					select: 'name avatar status department position',
					populate: {
						path: 'department',
						select: 'name'
					}
				})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions,
					joinedAt: member.joinedAt
				};
				return memberData;
			})
			const removedMembers = await Users.find({
				_id: { $in: membersToRemove }
			}).select('name avatar status department position').populate('department', 'name').lean().exec();

			const systemMessage = await Messages.create({
				conversationId: updatedConv._id,
				sender: updatedBy._id,
				type: 'system',
				content: `${updatedBy.name} removed members from the group`,
				metadata: {
					action: 'member_removed',
					removedBy: {
						_id: updatedBy._id,
						name: updatedBy.name
					},
					removedMembers: removedMembers.map(member => ({
						_id: member._id,
						name: member.name,
						avatar: member.avatar,
						department: member.department.name,
						position: member.position
					}))
				}
			});

			await Conversations.findByIdAndUpdate(conversationId, {
				lastMessage: systemMessage._id
			});

			const populatedMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean().exec();

			const convIdString = conversationId.toString();
			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				if (memberIdString === updatedBy._id.toString()) continue;

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: updatedConv._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)
					if (memberSocketId) {
						io.to(memberSocketId).emit('chat:update', {
							type: 'update_members',
							data: {
								conversationId,
								members: enrichedMembers,
								updatedBy,
								conversationType,
								lastMessage: populatedMessage,
								unreadCount: 1,
								isIncrement: true
							}
						});
					}
				}
			}
			socket.to(conversationId).emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			socket.emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					updatedBy,
					conversationType,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			for (const removedMemberId of membersToRemove) {
				const removedSocketId = userSocketMap.get(removedMemberId.toString());

				if (removedMemberId) {
					io.to(removedSocketId).emit('group:removed', {
						conversationId,
						removedBy: {
							_id: updatedBy._id,
							name: updatedBy.name
						}
					})
				}
			}
		});

		socket.on('group:leave', async (data) => {
			console.log('Group leave event received:', data);
			const { conversationId, user } = data;
			try {
				const conversation = await Conversations.findById(conversationId).lean().exec();

				if (!conversation) {
					throw new Error('Conversation not found');
				};

				const member = await ConversationMember.findOne({
					conversationId,
					memberId: user._id
				}).lean().exec();

				if (!member) {
					throw new Error('You are not a member of this conversation');
				}

				await ConversationMember.deleteOne({
					conversationId,
					memberId: user._id
				});

				const systemMessage = await Messages.create({
					conversationId,
					sender: user._id,
					type: 'system',
					content: `${user.name} left the group`,
					metadata: {
						action: 'member_left',
						leftBy: {
							_id: user._id,
							name: user.name
						}
					}
				})

				await Conversations.findByIdAndUpdate(conversationId, {
					lastMessage: systemMessage._id
				});
				const populatedMessage = await Messages.findById(systemMessage._id)
					.populate('sender', 'name avatar status')
					.lean().exec();

				const members = await ConversationMember.find({
					conversationId
				})
					.populate({
						path: 'memberId',
						select: 'name avatar status department position',
						populate: {
							path: 'department',
							select: 'name'
						}
					})
					.lean()
					.exec();

				const enrichedMembers = members.map(member => {
					const memberData = {
						...member.memberId,
						role: member.role,
						permissions: member.permissions
					};
					return memberData;
				})

				const convIdString = conversationId.toString();

				socket.to(conversationId).emit('chat:update', {
					type: 'update_members',
					data: {
						conversationId,
						members: enrichedMembers,
						leftUser: {
							_id: user._id,
							name: user.name
						},
						lastMessage: populatedMessage,
						unreadCount: 0
					}
				})

				for (const member of members) {
					const memberIdString = member.memberId._id.toString();
					const memberSocketId = userSocketMap.get(memberIdString);

					const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

					if (!isInRoom && memberSocketId) {
						await ConversationMember.findOneAndUpdate(
							{
								conversationId: conversationId._id,
								memberId: member.memberId._id
							},
							{ $inc: { unreadCount: 1 } }
						)

						io.to(memberSocketId).emit('chat:update', {
							type: 'update_members',
							data: {
								conversationId,
								members: enrichedMembers,
								leftUser: {
									_id: user._id,
									name: user.name
								},
								lastMessage: populatedMessage,
								unreadCount: 1,
								isIncrement: true
							}
						});
					}
				}

				const userSocketId = userSocketMap.get(user._id.toString());

				if (userSocketId) {
					io.to(userSocketId).emit('group:left', {
						conversationId
					});
				}

				socket.emit('group:leave-success', {
					conversationId,
					message: 'You have left the group'
				})
			} catch (error) {
				console.error('Error leaving group:', error);
			}
		})

		socket.on('transfer:admin', async (data) => {
			const { conversationId, currentUserId, newAdminId } = data;

			const updatedUser = await conversationService.transferAdminRole(conversationId, currentUserId._id, newAdminId._id);

			const members = await ConversationMember.find({
				conversationId,
			}).populate({
				path: 'memberId',
				select: 'name avatar status department position',
				populate: {
					path: 'department',
					select: 'name'
				}
			})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions
				};
				return memberData;
			});


			const systemMessage = await Messages.create({
				conversationId,
				sender: currentUserId,
				type: 'system',
				content: `${currentUserId.name} transferred admin role to ${newAdminId.name}`,
				metadata: {
					action: 'admin_transferred',
					transferredBy: {
						_id: currentUserId._id,
						name: currentUserId.name
					},
					newAdmin: {
						_id: newAdminId._id,
						name: newAdminId.name
					}
				}
			});

			await Conversations.findByIdAndUpdate(conversationId, {
				lastMessage: systemMessage._id
			})

			const populatedMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean().exec();

			const convIdString = conversationId.toString();
			socket.to(conversationId).emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newAdmin: updatedUser,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			socket.emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newAdmin: updatedUser,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom && memberSocketId) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: conversationId._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)

					io.to(memberSocketId).emit('chat:update', {
						type: 'update_members',
						data: {
							conversationId,
							members: enrichedMembers,
							newAdmin: updatedUser,
							lastMessage: populatedMessage,
							unreadCount: 1,
							isIncrement: true
						}
					});
				}
			}
		})
		socket.on('transfer:deputy', async (data) => {
			const { conversationId, currentUserId, newDeputyId } = data;

			const updatedUser = await conversationService.assignDeputyAdmin(conversationId, currentUserId._id, newDeputyId._id);

			const members = await ConversationMember.find({
				conversationId,
			}).populate({
				path: 'memberId',
				select: 'name avatar status department position unreadCount',
				populate: {
					path: 'department',
					select: 'name'
				}
			})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions
				};
				return memberData;
			});


			const systemMessage = await Messages.create({
				conversationId,
				sender: currentUserId,
				type: 'system',
				content: `${currentUserId.name} transferred deputy admin role to ${newDeputyId.name}`,
				metadata: {
					action: 'deputy_transferred',
					transferredBy: {
						_id: currentUserId._id,
						name: currentUserId.name
					},
					newDeputy: {
						_id: newDeputyId._id,
						name: newDeputyId.name
					}
				}
			});

			await Conversations.findByIdAndUpdate(conversationId, {
				lastMessage: systemMessage._id
			})

			const populatedMessage = await Messages.findById(systemMessage._id)
				.populate('sender', 'name avatar status')
				.lean().exec();

			const convIdString = conversationId.toString();
			socket.to(conversationId).emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newDeputy: updatedUser,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			socket.emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newDeputy: updatedUser,
					lastMessage: populatedMessage,
					unreadCount: 0
				}
			});

			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom && memberSocketId) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: conversationId._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)

					io.to(memberSocketId).emit('chat:update', {
						type: 'update_members',
						data: {
							conversationId,
							members: enrichedMembers,
							newDeputy: updatedUser,
							lastMessage: populatedMessage,
							unreadCount: 1,
							isIncrement: true
						}
					});
				}
			}
		})
		socket.on('recall:deputy', async (data) => {
			const { conversationId, currentUserId, deputyId } = data;

			const updatedUser = await conversationService.recallDeputy(conversationId, currentUserId, deputyId);

			const members = await ConversationMember.find({
				conversationId,
			}).populate({
				path: 'memberId',
				select: 'name avatar status department position',
				populate: {
					path: 'department',
					select: 'name'
				}
			})
				.lean()
				.exec();

			const enrichedMembers = members.map(member => {
				const memberData = {
					...member.memberId,
					role: member.role,
					permissions: member.permissions
				};
				return memberData;
			});

			const convIdString = conversationId.toString();
			socket.to(conversationId).emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newDeputy: updatedUser,
				}
			});

			socket.emit('chat:update', {
				type: 'update_members',
				data: {
					conversationId,
					members: enrichedMembers,
					newDeputy: updatedUser,
				}
			});

			for (const member of members) {
				const memberIdString = member.memberId._id.toString();
				const memberSocketId = userSocketMap.get(memberIdString);

				const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

				if (!isInRoom && memberSocketId) {
					await ConversationMember.findOneAndUpdate(
						{
							conversationId: conversationId._id,
							memberId: member.memberId._id
						},
						{ $inc: { unreadCount: 1 } }
					)

					io.to(memberSocketId).emit('chat:update', {
						type: 'update_members',
						data: {
							conversationId,
							members: enrichedMembers,
							newDeputy: updatedUser,
							unreadCount: 1,
							isIncrement: true
						}
					});
				}
			}
		})
		socket.on('conversation:enter', async (data) => {
			try {
				const { conversationId } = data;
				// console.log('Conversation received:', conversationId);

				// Skip database operations for temporary conversations
				if (conversationId && conversationId.toString().startsWith('temp_')) {
					console.log('Skipping conversation:enter for temporary conversation:', conversationId);
					return;
				}

				socket.join(conversationId.toString());

				const userIdString = socket.userId.toString();

				if (!userActiveConversations.has(userIdString)) {
					userActiveConversations.set(userIdString, new Set());
				}
				userActiveConversations.get(userIdString).add(conversationId.toString());

				socket.to(conversationId.toString()).emit('user:entered', {
					conversationId,
					userId: socket.userId
				});

				const readResult = await markMessageAsRead(conversationId, socket.userId);

				socket.to(conversationId.toString()).emit('conversation:read', {
					conversationId,
					readBy: readResult.readBy
				});
				const typingUsers = await Typing.find({ conversationId })
					.populate('userId', 'name avatar')
					.lean()

				if (typingUsers.length > 0) {
					socket.emit('typing:users', {
						conversationId,
						users: typingUsers.map(user => ({
							_id: user._id,
							name: user.name,
							avatar: user.avatar
						}))
					});
				}
			} catch (error) {
				console.error('Error entering conversation', error);
			}
		});
		socket.on('conversation:leave', async (data) => {
			const { conversationId } = data;
			console.log('Conversation leave event received:', conversationId);
			
			// Skip database operations for temporary conversations
			if (conversationId && conversationId.toString().startsWith('temp_')) {
				console.log('Skipping conversation:leave for temporary conversation:', conversationId);
				return;
			}
			
			socket.leave(conversationId.toString());
			const userIdString = socket.userId.toString();

			if (userActiveConversations.has(userIdString)) {
				userActiveConversations.get(userIdString).delete(conversationId.toString());
			}

			socket.to(conversationId.toString()).emit('user:left', {
				conversationId,
				userId: socket.userId
			});
			console.log('User left conversation:', {
				userId: userIdString,
				conversationId,
				activeConversations: userActiveConversations.get(userIdString)
			})
		})
		socket.on('conversation:mark-read', async (data) => {
			try {
				const { conversationId } = data;

				// Skip database operations for temporary conversations
				if (conversationId && conversationId.toString().startsWith('temp_')) {
					console.log('Skipping conversation:mark-read for temporary conversation:', conversationId);
					return;
				}

				const result = await markMessageAsRead(conversationId, socket.userId);

				await ConversationMember.findOneAndUpdate(
					{
						conversationId,
						memberId: socket.userId
					},
					{ unreadCount: 0 }
				)
				const members = await ConversationMember.find({ conversationId });

				members.forEach(member => {
					const memberSocketId = userSocketMap.get(member.memberId.toString());
					if (memberSocketId && member.memberId.toString() !== socket.userId.toString()) {
						io.to(memberSocketId).emit('conversation:read', {
							conversationId,
							readBy: result.readBy,
							readById: socket.userId
						});
					}
				})
			} catch (error) {
				console.error('Error marking conversation as read', error);
			}
		})

		socket.on('typing:start', async (data) => {
			console.log('Typing event received:', data);
			try {
				const { conversationId } = data;
				if (conversationId && conversationId.toString().startsWith('temp_')) {
					console.log('Skipping typing:start for temporary conversation:', conversationId);
					return;
				}
				await Typing.findOneAndUpdate(
					{ userId: socket.userId, conversationId },
					{
						userId: socket.userId,
						conversationId,
						timestamp: new Date()
					},
					{ upsert: true, new: true }
				)
				const user = await Users.findById(socket.userId).select('name avatar').lean().exec()
				socket.to(conversationId.toString()).emit('user:typing', {
					conversationId,
					userData: {
						_id: user._id,
						name: user.name,
						avatar: user.avatar
					}
				});
			} catch (error) {
				console.error('Error typing start', error);
			}
		});

		socket.on('typing:stop', async (data) => {
			console.log('Typing stop event received:', data);
			try {
				const { conversationId } = data;

				if (conversationId && conversationId.toString().startsWith('temp_')) {
					console.log('Skipping typing:stop for temporary conversation:', conversationId);
					return;
				}

				await Typing.deleteOne({
					userId: socket.userId,
					conversationId
				})
				socket.to(conversationId.toString()).emit('user:stopped-typing', {
					conversationId,
					userId: socket.userId
				});
			} catch (error) {
				console.error('Error typing start', error);
			}
		});
		socket.on('send:message', async (data) => {
			try {
				let { conversationId, content, type, replyTo, attachments, tempId } = data;
				let newConversation = null;
				let wasTemporary = false;
				let recipientId = null;

				if (conversationId.startsWith('temp_')) {
					const originalTempId = conversationId;
					const tempChatInfo = temporaryChats.get(conversationId);
					if (!tempChatInfo) {
						throw new Error('Temporary chat not found');
					}

					const { newConversation: createdConversation, members } = await createConversation(tempChatInfo, socket.userId);
					conversationId = createdConversation._id.toString();
					wasTemporary = true;
					recipientId = tempChatInfo.contactId;

					temporaryChats.delete(originalTempId);

					// Notify the sender about the conversation creation
					socket.emit('chat:created', {
						oldId: originalTempId,
						newConversation: {
							...createdConversation.toObject(),
							members
						}
					});
				}

				const isMember = await ConversationMember.findOne({
					conversationId,
					memberId: socket.userId
				}).populate({
					path: 'memberId',
					select: 'role customPermissions',
					populate: [
						{
							path: 'role',
							select: 'permissions',
							populate: {
								path: 'permissions',
								select: 'manageDepartment'
							}
						},
						{
							path: 'customPermissions',
							select: 'manageDepartment'
						}
					]
				});
				console.log('Is member:', isMember);
				if (!isMember) {
					throw new Error('You are not a member of this conversation');
				}

				// Kiểm tra quyền gửi tin nhắn
				let canSendMessage = isMember.permissions.canChat;

				// Nếu không có quyền chat thông thường, kiểm tra permissionSystem
				if (!canSendMessage) {
					let hasManageDepartmentPermission = false;

					// Kiểm tra customPermissions trước
					if (isMember.memberId.role.permissions.manageDepartment) {
						hasManageDepartmentPermission = true;
					}
					// Nếu không có customPermissions, kiểm tra role permissions
					else if (isMember.memberId.role &&
						isMember.memberId.role.permissions &&
						isMember.memberId.role.permissions.manageDepartment) {
						hasManageDepartmentPermission = true;
					}

					// Nếu có quyền manageDepartment thì cho phép gửi tin nhắn
					if (hasManageDepartmentPermission) {
						canSendMessage = true;
					}
				}

				if (!canSendMessage) {
					throw new Error('You do not have permission to send messages in this conversation');
				}
				// MÃ HÓA NỘI DUNG TIN NHẮN
				const encryptedContent = content ? encryptionService.encryptMessage(content, conversationId) : content;

				// Mã hóa tên file trong attachments
				const encryptedAttachments = attachments.map(attachment => ({
					...attachment,
					fileName: attachment.fileName ?
						encryptionService.encryptFileName(attachment.fileName, conversationId) :
						attachment.fileName
				}));

				const messageData = {
					conversationId,
					sender: socket.userId,
					content: encryptedContent, // Lưu nội dung đã mã hóa
					type: encryptedAttachments.length > 0 ? 'multimedia' : type,
					replyTo,
					attachments: encryptedAttachments,
					tempId
				}
				console.log('Message data:', messageData);
				const populatedMessage = await messageService.createMessage({ messageData });
				const fullyPopulatedMessage = await Messages.findById(populatedMessage._id)
					.populate('sender', 'name avatar status')
					.populate('replyTo', 'content sender')
					.populate({
						path: 'attachments',
						select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
					})
					.lean();

				const members = await ConversationMember.find({
					conversationId
				});

				const activeRecipients = [];
				const updatedConv = await Conversations.findByIdAndUpdate(
					conversationId,
					{ lastMessage: populatedMessage._id },
					{ new: true }
				).populate({
					path: 'lastMessage',
					select: 'content type createdAt attachments sentAt sender isRecalled isEdited',
					populate: [
						{
							path: 'sender',
							select: 'name avatar status',
						},
						{
							path: 'attachments',
							select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
						}
					]
				}).lean();

				for (const member of members) {
					const memberId = member.memberId.toString();
					if (memberId === socket.userId.toString()) continue;
					const isActive = isUserActiveInConversation(memberId, conversationId.toString());
					if (isActive) {
						activeRecipients.push(memberId);
					}
					await sendMessageToRecipient(populatedMessage, memberId);
				}
				const messageStatus = activeRecipients.length > 0 ? 'read' : 'sent';

				// GIẢI MÃ TIN NHẮN TRƯỚC KHI GỬI CHO CLIENT
				const decryptedMessage = {
					...fullyPopulatedMessage,
					content: encryptionService.decryptMessage(fullyPopulatedMessage.content, conversationId),
					attachments: fullyPopulatedMessage.attachments ?
						fullyPopulatedMessage.attachments.map(attachment => ({
							...attachment,
							fileName: encryptionService.decryptFileName(attachment.fileName, conversationId)
						})) : []
				};

				// Giải mã lastMessage trong updatedConv
				if (updatedConv.lastMessage) {
					updatedConv.lastMessage.content = encryptionService.decryptMessage(
						updatedConv.lastMessage.content,
						conversationId
					);

					if (updatedConv.lastMessage.attachments && updatedConv.lastMessage.attachments.length > 0) {
						updatedConv.lastMessage.attachments = updatedConv.lastMessage.attachments.map(attachment => ({
							...attachment,
							fileName: encryptionService.decryptFileName(attachment.fileName, conversationId)
						}));
					}
				}
				// Emit với data đã được giải mã
				io.to(conversationId.toString()).emit('message:new', {
					conversationId: conversationId,
					message: decryptedMessage,
					// lastMessage: decryptedMessage, // ĐÃ ĐƯỢC GIẢI MÃ
					unreadCount: 0
				});

				// If this was a temporary conversation, notify the recipient about the new conversation
				if (wasTemporary && recipientId) {
					const recipientSocketId = userSocketMap.get(recipientId.toString());
					if (recipientSocketId) {
						io.to(recipientSocketId).emit('chat:new', {
							newConversation: {
								...updatedConv,
								members: await ConversationMember.find({ conversationId })
									.populate('memberId', 'name avatar status department email position phoneNumber')
									.lean()
									.then(members => members.map(member => member.memberId))
							}
						});
					}
				}

				socket.emit('message:sent', {
					success: true,
					message: decryptedMessage,
					tempId,
					conversationId: conversationId
				});
			} catch (error) {
				console.error('Error sending message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		});
		const cleanupTemporaryChats = () => {
			const now = new Date();
			for (const [key, value] of temporaryChats.entries()) {
				if (now - value.createdAt > 3600000) {
					temporaryChats.delete(key);
				}
			}
		};

		setInterval(cleanupTemporaryChats, 3600000);


		socket.on('edit:message', async (data) => {
			try {
				const { messageId, content } = data;
				const updatedMessage = await messageService.editMessage({ messageId, userId: socket.userId, content });

				socket.emit('message:updated', {
					success: true,
					message: updatedMessage
				});
			} catch (error) {
				console.error('Error editing message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		});

		socket.on('reply:message', async (data) => {
			try {
				const { messageId, content, tempId } = data;
				const updatedMessage = await messageService.replyMessage({ messageId, userId: socket.userId, content });

				const originalMessage = await Messages.findById(messageId)
					.populate('sender', 'name avatar status')
					.lean();
				if (!originalMessage) {
					throw new Error('Original message not found');
				}
				const populatedMessage = await Messages.findById(updatedMessage._id)
					.populate('sender', 'name avatar status')
					.populate({
						path: 'replyTo',
						select: 'content sender',
						populate: {
							path: 'sender',
							select: '_id name avatar status'
						}
					}).lean();

				const replyMess = await Conversations.findByIdAndUpdate(
					populatedMessage.conversationId,
					{ lastMessage: populatedMessage._id }
				)
				console.log('Reply message:', replyMess);
				const members = await ConversationMember.find({
					conversationId: populatedMessage.conversationId
				}).populate('memberId', 'name avatar status department position');

				const activeRecipients = [];
				for (const member of members) {
					let memberUserId;
					if (typeof member.memberId === 'object' && member.memberId !== null) {
						memberUserId = member.memberId._id;
					} else {
						memberUserId = member.memberId;
					}
					if (member.memberId.toString() !== socket.userId.toString()) {
						const isActive = isUserActiveInConversation(
							memberUserId,
							populatedMessage.conversationId
						)
						if (isActive) {
							activeRecipients.push(memberUserId.toString())
						}
						await sendMessageToRecipient(updatedMessage, memberUserId);
					}
				}
				socket.emit('message:reply-success', {
					success: true,
					message: {
						...populatedMessage,
						status: activeRecipients.length > 0 ? 'read' : 'sent'
					},
					tempId,
					conversationId: populatedMessage.conversationId.toString()
				});
				// Add this to your reply:message handler
				const senderSocketId = userSocketMap.get(socket.userId.toString());
				if (senderSocketId) {
					socket.emit('message:sent', {
						success: true,
						message: {
							...populatedMessage,
							status: activeRecipients.length > 0 ? 'read' : 'sent'
						},
						tempId,
						conversationId: populatedMessage.conversationId.toString()
					});
				}
			} catch (error) {
				console.error('Error replying to message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})
		socket.on('pin:message', async (data) => {
			try {
				const { messageId, conversationId } = data;
				const pinnedMessage = await messageService.pinnedMessage({ messageId, userId: socket.userId });

				const actorSocketId = socket.userId.toString();

				const actor = await Users.findById(actorSocketId).select('name avatar status department').populate('department', 'name');

				const sytemMessage = await Messages.create({
					conversationId: pinnedMessage.conversationId,
					sender: socket.userId,
					type: 'system',
					content: `${actor.name} pinned a message`,
					metadata: {
						action: 'message_pinned',
						pinnedBy: {
							_id: actor._id,
							name: actor.name
						},
						pinnedMessage: pinnedMessage.messageId
					}
				});

				const updatedConversation = await Conversations.findByIdAndUpdate(
					pinnedMessage.conversationId,
					{
						lastMessage: sytemMessage._id,
						$addToSet: { pinnedMessages: pinnedMessage.messageId }
					},
					{ new: true }
				).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status').lean();

				io.to(conversationId).emit('message:pin-success', {
					success: true,
					message: pinnedMessage.messageId,
					conversationId: pinnedMessage.conversationId,
					isPinned: true,
					userPinned: pinnedMessage.userPinned,
					actor,
					lastMessage: sytemMessage,
					conversation: updatedConversation
				});
				const members = await ConversationMember.find({
					conversationId: pinnedMessage.conversationId
				});
				let updatedUnreadCount = null;
				for (const member of members) {
					const recipientSocketId = userSocketMap.get(member.memberId.toString());
					if (recipientSocketId === actor._id.toString()) continue;
					const isInRoom = isUserActiveInConversation(member.memberId.toString(), pinnedMessage.conversationId.toString());

					if (!isInRoom && recipientSocketId) {
						const updatedMember = await ConversationMember.findOneAndUpdate(
							{
								conversationId: pinnedMessage.conversationId,
								memberId: member.memberId
							},
							{ $inc: { unreadCount: 1 } },
							{ new: true }
						)
						updatedUnreadCount = updatedMember.unreadCount;
					}
					if (recipientSocketId) {
						io.to(recipientSocketId).emit('message:pin-success', {
							success: true,
							message: pinnedMessage.messageId,
							conversationId: pinnedMessage.conversationId,
							isPinned: true,
							userPinned: pinnedMessage.userPinned,
							actor,
							lastMessage: sytemMessage,
							conversation: updatedConversation,
							isIncrement: !isInRoom,
							unreadCount: updatedUnreadCount
						});
					}
				}
			} catch (error) {
				console.error('Error pinning message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})
		socket.on('unpin:message', async (data) => {
			console.log('Unpin message event received:', data);
			try {
				const { messageId, conversationId } = data;
				const unpinnedMessage = await messageService.unpinnedMessage({ messageId, userId: socket.userId });

				const actorSocketId = socket.userId.toString();

				const actor = await Users.findById(actorSocketId).select('name avatar status department').populate('department', 'name');

				const sytemMessage = await Messages.create({
					conversationId: unpinnedMessage.conversationId,
					sender: socket.userId,
					type: 'system',
					content: `${actor.name} unpinned a message`,
					metadata: {
						action: 'message_unpinned',
						pinnedBy: {
							_id: actor._id,
							name: actor.name
						},
						pinnedMessage: unpinnedMessage.messageId
					}
				});

				const updatedConversation = await Conversations.findByIdAndUpdate(
					unpinnedMessage.conversationId,
					{
						lastMessage: sytemMessage._id,
						$addToSet: { pinnedMessages: unpinnedMessage.messageId }
					},
					{ new: true }
				).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status metadata').lean();

				io.to(conversationId).emit('message:unpin-success', {
					success: true,
					message: unpinnedMessage.messageId,
					conversationId: unpinnedMessage.conversationId,
					isPinned: false,
					userPinned: unpinnedMessage.userPinned,
					actor,
					lastMessage: updatedConversation.lastMessage,
					conversation: updatedConversation
				});

				const members = await ConversationMember.find({
					conversationId: unpinnedMessage.conversationId
				});
				let updatedUnreadCount = null;
				for (const member of members) {
					const recipientSocketId = userSocketMap.get(member.memberId.toString());
					if (recipientSocketId === actor._id.toString()) continue;
					const isInRoom = isUserActiveInConversation(member.memberId.toString(), unpinnedMessage.conversationId.toString());

					if (!isInRoom && recipientSocketId) {
						const updatedMember = await ConversationMember.findOneAndUpdate(
							{
								conversationId: unpinnedMessage.conversationId,
								memberId: member.memberId
							},
							{ $inc: { unreadCount: 1 } },
							{ new: true }
						)
						updatedUnreadCount = updatedMember.unreadCount;
					}
					if (recipientSocketId) {
						io.to(recipientSocketId).emit('message:unpin-success', {
							success: true,
							message: unpinnedMessage.messageId,
							conversationId: unpinnedMessage.conversationId,
							isPinned: false,
							userPinned: unpinnedMessage.userPinned,
							actor,
							lastMessage: updatedConversation.lastMessage,
							conversation: updatedConversation,
							isIncrement: !isInRoom,
							unreadCount: updatedUnreadCount
						});
					}
				}
			} catch (error) {
				console.error('Error unpinning message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		});

		socket.on('pin:conversation', async (data) => {
			try {
				const { conversationId } = data;
				const pinnedConversation = await conversationService.pinConversation(conversationId, socket.userId.toString());
				socket.emit('conversation:pin-success', {
					success: true,
					conversationId: pinnedConversation._id,
					isPinned: pinnedConversation.isPinned
				});
			} catch (error) {
				console.error('Error pinning conversation', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})

		socket.on('recall:message', async (data) => {
			try {
				const { messageId, recallType, conversationId } = data;
				const recalledMessage = await messageService.recallMessage({ messageId, userId: socket.userId, recallType });				const updatedConversation = await Conversations.findByIdAndUpdate(
					recalledMessage.conversationId,
					{ lastMessage: recalledMessage._id },
					{ new: true }
				).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status');

				const actorSocketId = socket.userId.toString();

				const actor = await Users.findById(actorSocketId).select('name avatar status department').populate('department', 'name');

				io.to(conversationId).emit('message:recall-success', {
					success: true,
					message: recalledMessage.messageId,
					conversationId: recalledMessage.conversationId,
					isRecalled: true,
					recallType: recalledMessage.recallType,
					actor,
					lastMessage: updatedConversation.lastMessage
				});

				socket.emit('message:recall-success', {
					success: true,
					message: recalledMessage.messageId,
					conversationId: recalledMessage.conversationId,
					isRecalled: true,
					recallType: recalledMessage.recallType,
					actor,
					lastMessage: updatedConversation.lastMessage
				});
				const members = await ConversationMember.find({
					conversationId: recalledMessage.conversationId
				});

				for (const member of members) {
					const recipientSocketId = userSocketMap.get(member.memberId.toString());
					if (recipientSocketId) {
						io.to(recipientSocketId).emit('message:recall-success', {
							success: true,
							message: recalledMessage.messageId,
							conversationId: recalledMessage.conversationId,
							isRecalled: true,
							recallType: recalledMessage.recallType,
							actor,
							lastMessage: updatedConversation.lastMessage
						});

						io.to(conversationId).emit('chat:update', {
							type: 'recall_message',
							data: {
								messageId: recalledMessage.messageId,
								recallType: recalledMessage.recallType,
								message: recalledMessage,
								lastMessage: updatedConversation.lastMessage,
								actor,
								conversationId: recalledMessage.conversationId
							}
						});
					}
				}
			} catch (error) {
				console.error('Error recalling message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})

		socket.on('message:reaction', async (data) => {
			// console.log('Received message:reaction event:', data);
			try {
				const { messageId, emoji } = data;
				const updatedMessage = await messageService.reactToMessage({ messageId, userId: socket.userId, emoji });
				// console.log('Updated message after reaction:', updatedMessage);
				io.to(updatedMessage.conversationId.toString()).emit('message:react-success', {
					success: true,
					messageId: updatedMessage._id,
					conversationId: updatedMessage.conversationId,
					reactions: updatedMessage.reactions
				});
			
			} catch (error) {
				console.error('Error reacting to message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})

		socket.on('message:remove-reaction', async (data) => {
			try {
				const { messageId, emoji } = data;
				const updatedMessage = await messageService.removeReaction({ messageId, userId: socket.userId, emoji });
				io.to(updatedMessage.conversationId.toString()).emit('message:react-success', {
					success: true,
					messageId: updatedMessage._id,
					conversationId: updatedMessage.conversationId,
					reactions: updatedMessage.reactions
				});
			
			} catch (error) {
				console.error('Error removing reaction from message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		});

		socket.on('message:read', async (data) => {
			try {
				const { messageId } = data;

				const message = await Messages.findOne({
					_id: messageId,
					'readBy.user': { $ne: socket.userId }
				});
				if (!message) {
					return socket.emit('message:error', {
						error: 'Message already read',
						messageId
					});
				}

				const alreadyRead = message.readBy.some(read =>
					read.user.toString() === socket.userId.toString()
				);

				if (!alreadyRead) {
					await Messages.findByIdAndUpdate(messageId, {
						$push: {
							readBy: {
								user: socket.userId,
								readAt: new Date()
							}
						}
					});

					const senderSocketId = userSocketMap.get(message.sender.toString());
					if (senderSocketId) {
						io.to(senderSocketId).emit('message:read', {
							messageId,
							readBy: { user: socket.userId, readAt: new Date() }
						})
					}
				}
			} catch (error) {
				console.error('Error reading message', error);
			}
		})
		socket.on('call:initiate', async (data) => {
			console.log('Call event received:', data);
			const { conversationId, type, recipientId } = data;

			if (!socket.userId) {
				console.warn('User ID not found in socket:', socket.id);
				socket.emit('call:error', { error: 'User ID not found' });
				return;
			}

			const recipientSocketId = userSocketMap.get(recipientId.toString());
			if (!recipientSocketId) {
				console.warn('Recipient not connected:', recipientId);
				socket.emit('call:error', { error: 'User is not online' });
				return;
			}

			// Check if recipient socket is still connected
			const recipientSocket = io.sockets.sockets.get(recipientSocketId);
			if (!recipientSocket || !recipientSocket.connected) {
				console.warn('Recipient socket disconnected:', recipientId);
				socket.emit('call:error', { error: 'User is not online' });
				return;
			}

			try {
				const initiatorUser = await Users.findById(socket.userId).select('name avatar').lean();

				if (!initiatorUser) {
					console.warn('Initiator user not found:', socket.userId);
					socket.emit('call:error', { error: 'Initiator user not found' });
					return;
				}

				const newCall = new Call({
					conversationId,
					initiator: socket.userId,
					type,
					participants: [
						{ user: socket.userId, status: 'answered', joinedAt: new Date() },
						{ user: recipientId, status: 'ringing' }
					],
					status: 'started',
					startTime: new Date()
				});
				await newCall.save();				
				console.log(`New call ${newCall._id} initiated by ${socket.userId} to ${recipientId}`);

				const conversation = await Conversations.findById(conversationId).lean();
				let conversationName = 'Private Chat';

				if (conversation && conversation.type === 'private') {
					// For private conversations, get the other member's name
					const members = await ConversationMember.find({ conversationId })
						.populate('memberId', 'name')
						.lean();
					
					if (members?.length == 2) {
						const otherMember = members.find(member => member.memberId._id.toString() !== socket.userId.toString());
						if (otherMember) {
							conversationName = otherMember.memberId.name;
						}
					}
				} else if (conversation && conversation.type === 'group') {
					conversationName = conversation.name || 'Group Chat';
				} else if (conversation && conversation.type === 'department') {
					conversationName = conversation.name || 'Department Chat';
				}				
				console.log(`Emitting call:incoming to recipient ${recipientId} with socketId: ${recipientSocketId}`);
				console.log('Call data being sent:', {
					callId: newCall._id,
					initiator: {
						_id: initiatorUser._id,
						name: initiatorUser.name,
						avatar: initiatorUser.avatar
					},
					conversationId,
					type: newCall.type,
					conversationName: conversationName,
				});
				
				io.to(recipientSocketId).emit('call:incoming', {
					callId: newCall._id,
					initiator: {
						_id: initiatorUser._id,
						name: initiatorUser.name,
						avatar: initiatorUser.avatar
					},
					conversationId,
					type: newCall.type,
					conversationName: conversationName,
				});				
				setTimeout(async () => checkMissedCall(newCall._id), 30000);				
				console.log(`🎯 About to emit call:initiated to socket ${socket.id} for call ${newCall._id}`);
				console.log(`🎯 Socket connected status:`, socket.connected);
				console.log(`🎯 Socket userId:`, socket.userId);
				console.log(`🎯 Emitting call:initiated with data:`, {
					callId: newCall._id,
					status: 'ringing'
				});
				
				// Double check socket is connected before emitting
				if (!socket.connected) {
					console.error(`🎯 ERROR: Socket ${socket.id} is not connected!`);
					return;
				}
				
				// Add a small delay to ensure event listeners are ready
				setTimeout(() => {
					console.log(`🎯 Emitting call:initiated after delay...`);
					socket.emit('call:initiated', {
						callId: newCall._id,
						status: 'ringing'
					});
					console.log(`🎯 call:initiated event emitted successfully to ${socket.userId}`);
				}, 100);
			} catch (error) {
				console.error('Error initiating call', error);
				socket.emit('call:error', { error: error.message });
			}
		});

		socket.on('call:answer', async (data) => {
			console.log('Call answer event received:', data);
			const { callId } = data;

			if (!socket.userId) return;

			try {
				const call = await Call.findById(callId);

				if (!call) {
					console.warn('Call not found:', callId);
					return;
				}

				if (call.status !== 'started') {
					console.warn('Call is not in a valid state to answer:', call.status);
					socket.emit('call:error', { error: 'Call is not in a valid state to answer' });
					return;
				}

				const participant = call.participants.find(p => p.user.toString() === socket.userId.toString());
				if (participant && participant.status === 'ringing') {
					participant.status = 'answered';
					participant.joinedAt = new Date();

					await call.save();
					console.log(`User ${socket.userId} answered call ${callId}`);				
					const initiatorSocketId = userSocketMap.get(call.initiator.toString());
				if (initiatorSocketId && initiatorSocketId !== socket.id) {
					console.log(`Notifying initiator ${call.initiator} about call answer`);
					
					// Get recipient user info to send to initiator
					const recipientUser = await Users.findById(socket.userId).select('name avatar').lean();
					
					io.to(initiatorSocketId).emit('call:answered', {
						callId,
						answeredId: socket.userId,
						status: 'answered',
						recipient: {
							_id: recipientUser._id,
							name: recipientUser.name,
							avatar: recipientUser.avatar
						}
					})
				} else {
					console.warn('Initiator not connected:', call.initiator);
					socket.emit('call:error', { error: 'Initiator not connected' });
					return;
				}
				}

				socket.emit('call:answer-confirmed', {
					callId,
					status: 'answered',
				})
			} catch (error) {
				console.error('Error answering call', error);
				socket.emit('call:error', { error: error.message });
			}
		});		
		socket.on('call:decline', async (data) => {
			console.log(`Call decline event received:`, data);
			const { callId, reason } = data;

			if (!socket.userId) return;

			try {
				const call = await Call.findById(callId);
				if (!call) {
					console.warn('Call not found:', callId);
					return;
				}
				const participant = call.participants.find(p => p.user.toString() === socket.userId.toString());
				if (participant && participant.status === 'ringing') {
					participant.status = 'declined';
					call.status = reason === 'no_offer_received' ? 'failed' : 'declined';
					call.endTime = new Date();
					
					// Log specific reason for debugging
					if (reason) {
						console.log(`Call declined with reason: ${reason}`);
					}
					
					await call.save();
					console.log(`User ${socket.userId} declined call ${callId}`);

					await logCallSystemMessage(call);

					// Notify initiator about call decline
					const initiatorSocketId = userSocketMap.get(call.initiator.toString());
					if (initiatorSocketId && initiatorSocketId !== socket.id) {
						console.log(`Notifying initiator ${call.initiator} about call decline`);
						io.to(initiatorSocketId).emit('call:declined', {
							callId,
							declinedId: socket.userId,
							reason: reason || 'user_declined'
						});
					}

					// Also send call:ended event to both participants to close IncallUI
					call.participants.forEach((participant) => {
						const participantSocketId = userSocketMap.get(participant.user.toString());
						if (participantSocketId) {
							console.log(`Sending call:ended to participant ${participant.user} to close IncallUI`);
							io.to(participantSocketId).emit('call:ended', {
								callId,
								status: call.status,
								declinedBy: socket.userId,
							});
						}
					});
				}
			} catch (error) {
				console.error('Error declining call', error);
				socket.emit('call:error', { error: error.message });
			}
		})

		socket.on('call:end', async (data) => {
			console.log('Call end event received:', data);
			const { callId } = data;

			if (!socket.userId) return;

			try {
				const call = await Call.findById(callId);
				if (!call) {
					console.warn('Call not found:', callId);
					return;
				}
				const participant = call.participants.find(p => p.user.toString() === socket.userId.toString());
				if (participant && participant.status !== 'ended') {
					participant.status = 'left';

					call.status = 'completed';
					call.endTime = new Date();
					await call.save();
					console.log(`User ${socket.userId} ended call ${callId}`);

					await logCallSystemMessage(call);

					const otherParticipant = call.participants.find(p => p.user.toString() !== socket.userId.toString());
					if (otherParticipant) {
						const otherSocketId = userSocketMap.get(otherParticipant.user.toString());
						if (otherSocketId && otherSocketId !== socket.id) {
							console.log(`Notifying other participant ${otherParticipant.user} about call end`);
							io.to(otherSocketId).emit('call:ended', {
								callId,
								status: call.status,
								endedBy: socket.userId,
							})
						}
					}
					socket.emit('call-ended', {
						callId,
						status: call.status,
						endedBy: socket.userId,
					})
				}
			} catch (error) {
				console.error('Error ending call', error);
				socket.emit('call:error', { error: error.message });
			}
		})
		const checkMissedCall = async (callId) => {
			const call = await Call.findById(callId);

			if (call && call.status === 'started') {
				call.status = 'missed';
				call.endTime = new Date();
				await call.save();
				console.log(`Call ${callId} marked as missed`);
				await logCallSystemMessage(call);

				call.participants.forEach(async (participant) => {
					const pSocketId = userSocketMap.get(participant.user.toString());
					if (pSocketId) {
						io.to(pSocketId).emit('call:missed', {
							callId,
							status: call.status,
						})
					}
				})
			}
		}
		socket.on('signal', (data) => {
			console.log(`Signal received from ${socket.userId}:`, data);
			console.log('Signal data structure:', JSON.stringify(data, null, 2));

			const { callId, signalData, recipientId } = data;
			
			// Validate signal structure
			if (!callId || !signalData || !recipientId) {
				console.error('Invalid signal data structure:', { callId, signalData, recipientId });
				return;
			}
			
			if (signalData.type === 'offer') {
				console.log('📤 Forwarding WebRTC offer signal');
				console.log('📤 Offer SDP preview:', signalData.offer?.sdp ? 
					signalData.offer.sdp.substring(0, 100) + '...' : 'NO SDP');
			}
			
			const recipientSocketId = userSocketMap.get(recipientId.toString());
			if (recipientSocketId) {
				console.log(`Forwarding signal to recipient ${recipientId} (socket: ${recipientSocketId})`);
				const forwardedData = {
					callId,
					signalData,
					senderId: socket.userId
				};
				console.log('📤 Forwarded signal structure:', JSON.stringify(forwardedData, null, 2));
				io.to(recipientSocketId).emit('signal', forwardedData);
			} else {
				console.warn(`Recipient ${recipientId} not connected`);
			}
		})
		socket.on('user:logout', async () => {
			console.log(`User logged out: ${socket.userId}`);
			await Users.findByIdAndUpdate(socket.userId, {
				status: 'offline',
				lastActive: new Date()
			});
			socket.broadcast.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			});
			socket.disconnect(true);
		})

		socketService.setSocketInstance(socket, io, helpers);

		socket.on('user:logout', async () => {
			await Users.findByIdAndUpdate(socket.userId, {
				status: 'offline',
				lastActive: new Date()
			});

			io.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			})
		})
		socket.on('disconnect', async (reason) => {
			console.log(`User disconnected: ${socket.userId}, reason: ${reason}`);

			try {
				// Update user status to offline
				await Users.findByIdAndUpdate(socket.userId, {
					status: 'offline',
					lastActive: new Date()
				});

				// Broadcast status update to all connected clients
				io.emit('user:status', {
					userId: socket.userId,
					status: 'offline'
				});

				// Clean up user data from maps
				const userIdString = socket.userId.toString();
				if (userActiveConversations.has(userIdString)) {
					userActiveConversations.delete(userIdString);
				}
				userSocketMap.delete(socket.userId.toString());
				socketUserMap.delete(socket.id);

				// Handle ongoing calls
				const onGoingCalls = await Call.find({
					'participants.user': socket.userId,
					status: { $in: ['started'] }
				});
				
				for (const call of onGoingCalls) {
					const participant = call.participants.find(p => p.user.toString() === socket.userId.toString());
					if (participant) {
						participant.status = 'left';
						call.status = 'completed';
						call.endTime = new Date();
						await call.save();
						await logCallSystemMessage(call);
					}
					
					if (call.participants.length === 2) {
						call.status = participant.status === 'left' ? 'failed' : 'message'
						call.endTime = new Date();
						await call.save();

						console.log(`Call ${call._id} marked as missed`);
						await logCallSystemMessage(call);

						const otherParticipant = call.participants.find(p => p.user.toString() !== socket.userId.toString());
						if (otherParticipant) {
							const otherSocketId = userSocketMap.get(otherParticipant.user.toString());
							if (otherSocketId && otherSocketId !== socket.id) {
								console.log(`Notifying other participant ${otherParticipant.user} about call end`);
								io.to(otherSocketId).emit('call:ended', {
									callId: call._id,
									status: call.status,
									diasconnectUserUd: socket.userId
								})
							}
						}
					}
					await call.save();
				}

				// Clean up typing status
				await Typing.deleteMany({ userId: socket.userId });

				console.log(`Cleanup completed for user: ${socket.userId}`);
			} catch (error) {
				console.error('Error during disconnect cleanup:', error);
				
				// Ensure status broadcast happens even if other operations fail
				try {
					io.emit('user:status', {
						userId: socket.userId,
						status: 'offline'
					});
				} catch (broadcastError) {
					console.error('Error broadcasting offline status:', broadcastError);
				}
			}
		});
	});

	const isUserActiveInConversation = (userId, conversationId) => {
		// Simple string conversion for IDs
		const userIdString = userId.toString();
		const conversationIdString = conversationId.toString();

		// Clean IDs (remove ObjectId wrapping if present)
		const cleanUserId = userIdString.replace(/ObjectId\(['"]?([^'"]+)['"]?\)/, '$1');
		const cleanConvId = conversationIdString.replace(/ObjectId\(['"]?([^'"]+)['"]?\)/, '$1');

		// Check if user is active in this conversation
		const userConversations = userActiveConversations.get(cleanUserId);
		return userActiveConversations.has(cleanUserId) && userConversations?.has(cleanConvId);
	};
	const markMessageAsRead = async (conversationId, userId) => {
		try {
			// Skip database operations for temporary conversations
			if (conversationId && conversationId.toString().startsWith('temp_')) {
				console.log('Skipping markMessageAsRead for temporary conversation:', conversationId);
				return { modifiedCount: 0, readBy: [] };
			}

			// First, update all unread messages in the conversation
			const result = await Messages.updateMany(
				{
					conversationId,
					sender: { $ne: userId },
					status: { $ne: 'read' }  // Only update messages that aren't already read
				},
				{
					$addToSet: {
						readBy: {
							user: userId,
							readAt: new Date()
						}
					},
					$set: { status: 'read' }
				}
			)

			// Get updated messages for readBy information
			const updatedMessages = await Messages.find({
				conversationId,
				status: 'read'
			}).populate('readBy.user', 'name').lean();

			const uniqueReadByMap = new Map();

			updatedMessages.forEach(msg => {
				if (!msg.sender) return;

				msg.readBy.forEach(rb => {
					if (!rb.user || !rb.user._id) return;

					if (rb.user._id.toString() !== msg.sender.toString()) {
						uniqueReadByMap.set(rb.user._id.toString(), rb.user);
					}
				})
			})

			const uniqueReadByUsers = Array.from(uniqueReadByMap.values());
			return {
				modifiedCount: result.modifiedCount,
				readBy: uniqueReadByUsers
			};
		} catch (error) {
			console.error('Error marking messages as read', error);
		}
	}

	const createConversation = async (tempChatInfo, initiatorId) => {
		console.log('Creating conversation with tempChatInfo:', tempChatInfo, 'initiatorId:', initiatorId);
		const newConversation = await Conversations.create({
			type: 'private',
			creator: initiatorId,
			isVisible: true
		})

		const memberData =
			[{
				conversationId: newConversation._id,
				memberId: tempChatInfo.initiatorId,
				role: 'member',
				permissions: {
					canChat: true,
					canAddMembers: false,
					canRemoveMembers: false,
					canEditConversation: false,
					canAssignDeputies: false,
				}
			},
			{
				conversationId: newConversation._id,
				memberId: tempChatInfo.contactId,
				role: 'member',
				permissions: {
					canChat: true,
					canAddMembers: false,
					canRemoveMembers: false,
					canEditConversation: false,
					canAssignDeputies: false,
				}
			}];
		try {
			await ConversationMember.insertMany(memberData);
			console.log('New conversation created:', newConversation._id);
		} catch (error) {
			console.error('Error creating conversation:', error);
			await Conversations.deleteOne({ _id: newConversation._id });
			throw new Error('Failed to create conversation members');
		}		const members = await ConversationMember.find({
			conversationId: newConversation._id
		}).populate({
			path: 'memberId',
			select: 'name avatar status department email position phoneNumber',
			populate: {
				path: 'department',
				select: 'name'
			}
		}).lean();

		return {
			newConversation,
			members: members.map(member => member.memberId)
		}
	}

	const verifyRecipientConnection = (recipientId) => {
		const socketId = userSocketMap.get(recipientId.toString());
		if (!socketId) return false;

		const socket = io.sockets.sockets.get(socketId);
		return socket && socket.connected;
	};

	const sendMessageToRecipient = async (message, recipientId) => {
		try {
			let recipientIdString;

			if (typeof recipientId === 'object' && recipientId !== null) {
				recipientIdString = recipientId._id ? recipientId._id.toString() : recipientId.toString();
			} else {
				recipientIdString = recipientId.toString();
			}

			const recipientSocketId = userSocketMap.get(recipientIdString);
			console.log(`Attemping to send message to recipient ${recipientId}:, socketId: ${recipientSocketId}`);

			if (!recipientSocketId || !verifyRecipientConnection(recipientIdString)) {
				console.error(`Recipient ${recipientId} is not connected or socket invalid`);
				return false;
			}

			try {
				const [
					populatedMessage,
					conversation,
					members,
					userMember
				] = await Promise.all([
					Messages.findById(message._id)
						.select('content type createdAt attachments sentAt sender isRecalled isEdited status replyTo recallType reactions')
						.populate('sender', 'name avatar status')
						.populate({
							path: 'replyTo',
							select: 'content sender',
							populate: [{
								path: 'sender',
								select: 'name avatar status'
							},
							{
								path: 'attachments',
								select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
							}]
						})
						.lean(),
					Conversations.findById(message.conversationId)
						.populate({
							path: 'lastMessage',
							select: 'content type createdAt attachments sentAt sender isRecalled isEdited',
							populate: [
								{
									path: 'sender',
									select: 'name avatar status',
								},
								{
									path: 'attachments',
									select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
								}
							]
						})
						.populate({
							path: 'creator',
							select: 'name avatar'
						})
						.lean(),
					ConversationMember.find({
						conversationId: message.conversationId
					}).populate('memberId', 'name avatar status').lean(),
					ConversationMember.findOne({
						conversationId: message.conversationId,
						memberId: recipientId
					}).lean()
				]);

				if (!populatedMessage) {
					console.error('Message not found');
					return false;
				}
				// ADD DECRYPTION HERE:
				const decryptedMessage = {
					...populatedMessage,
					content: encryptionService.decryptMessage(
						populatedMessage.content,
						message.conversationId.toString()
					),
					attachments: populatedMessage.attachments ?
						populatedMessage.attachments.map(attachment => ({
							...attachment,
							fileName: encryptionService.decryptFileName(
								attachment.fileName,
								message.conversationId.toString()
							)
						})) : []
				};
				// Also decrypt replyTo message if it exists
				if (decryptedMessage.replyTo && decryptedMessage.replyTo.content) {
					decryptedMessage.replyTo.content = encryptionService.decryptMessage(
						decryptedMessage.replyTo.content,
						message.conversationId.toString()
					);

					if (decryptedMessage.replyTo.attachments) {
						decryptedMessage.replyTo.attachments = decryptedMessage.replyTo.attachments.map(attachment => ({
							...attachment,
							fileName: encryptionService.decryptFileName(
								attachment.fileName,
								message.conversationId.toString()
							)
						}));
					}
				}

				const isSenderActive = isUserActiveInConversation(message.sender._id.toString(), message.conversationId.toString());
				const isRecipientActive = isUserActiveInConversation(recipientId.toString(), message.conversationId.toString());

				const recipientMember = await ConversationMember.findOneAndUpdate(
					{
						conversationId: message.conversationId,
						memberId: recipientId
					},
					{
						$setOnInsert: {
							conversationId: message.conversationId,
							memberId: recipientId,
							unreadCount: 0
						}
					},
					{
						upsert: true,
						new: true,
						rawResult: true
					}
				)
				let currentUnreadCount = 0;
				let updateUnreadCount = true;
				let messageStatus = 'sent';

				const memberDoc = recipientMember.value || recipientMember;

				if (isRecipientActive) {
					const readResult = await markMessageAsRead(message.conversationId, recipientId);
					messageStatus = 'read';
					updateUnreadCount = false;
					currentUnreadCount = 0;
				} else if (recipientId.toString() !== message.sender.toString()) {
					currentUnreadCount = (memberDoc.unreadCount || 0) + 1;
					await ConversationMember.findOneAndUpdate(
						{ conversationId: message.conversationId, memberId: recipientId },
						{ $set: { unreadCount: currentUnreadCount } }
					)
				}
				const conversationIdString = message.conversationId.toString();
				const updatedConversation = await Conversations.findById(message.conversationId)
					.populate({
						path: 'lastMessage',
						select: 'content type createdAt attachments sentAt sender isRecalled isEdited isPinned reactions status replyTo recallType',
						populate: [{
							path: 'sender',
							select: 'name avatar status',
						}, {
							path: 'attachments',
							select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
						}]
					}).lean();

				const fullMessagePayload = {
					conversationId: conversationIdString,
					message: decryptedMessage,
					unreadCount: currentUnreadCount,
					lastMessage: decryptedMessage,
				};

				if (recipientSocketId) {
					console.log(`Emitting message:new to socket ${recipientSocketId} for conversation ${conversationIdString}`);

					io.to(recipientSocketId).emit('message:new', fullMessagePayload);
					io.to(conversationIdString).emit('chat:update', {
						type: 'new_message',
						data: fullMessagePayload
					});
					if (updateUnreadCount) {
						io.to(recipientSocketId).emit('conversation:unread', {
							conversationId: message.conversationId,
							unreadCount: 1
						});
					} else {
						io.to(recipientSocketId).emit('conversation:read', {
							conversationId: message.conversationId
						});
					}
				}
				console.log('Emission completed for recipient');
				return true;
			} catch (error) {
				console.error('Error sending message to recipient', error);
				return false;
			}


		} catch (error) {
			console.error(`Error sending message to recipient ${recipientId}:`, error);
			return false;
		}
	};
	return {
		io,
		userSocketMap,
		...helpers,
	};
}

module.exports = setUpSocket;