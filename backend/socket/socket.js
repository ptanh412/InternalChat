const { Server } = require('socket.io');
const socketAuth = require('../middlewares/socketAuth');
const Users = require('../models/Users');
const Typing = require('../models/Typing');
const Notifications = require('../models/Notifications');
const ConversationMember = require('../models/ConversationMember');
const Messages = require('../models/Messages');
const Department = require('../models/Department');
const Conversations = require('../models/Conversations');

const setUpSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: process.env.CLIENT_URL,
			methods: ['GET', 'POST']
		},
	});

	const userSocketMap = new Map();
	const socketUserMap = new Map();
	const userActiveConversations = new Map();
	io.use(socketAuth);
	io.on('connection', async (socket) => {
		console.log(`User connected: ${socket.userId}`);

		await Users.findByIdAndUpdate(socket.userId, {
			status: 'online',
			lastActive: new Date()
		},
			{ new: true }
		);

		userSocketMap.set(socket.userId, socket.id);
		socketUserMap.set(socket.id, socket.userId);

		const unreadCount = await Notifications.countDocuments({
			received: socket.userId,
			isRead: false
		});
		io.emit('user:status', {
			userId: socket.userId,
			status: 'online'
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


		socket.on('conversation:enter', async (data) => {
			try {
				const { conversationId } = data;

				if (!userActiveConversations.has(socket.userId)) {
					userActiveConversations.set(socket.userId, new Set());
				}
				userActiveConversations.get(socket.userId).add(conversationId.toString());

				await markMessageAsRead(conversationId, socket.userId);
			} catch (error) {
				console.error('Error entering conversation', error);
			}
		});

		socket.on('conversation:leave', async (data) => {
			const { conversationId } = data;
			if (userActiveConversations.has(socket.userId)) {
				userActiveConversations.get(socket.userId).delete(conversationId.toString());
			}
		})



		socket.on('message:read', async (data) => {
			try {
				const { messageId } = data;

				const message = await Messages.findOne({
					_id: messageId,
					'readBy.user': { $ne: socket.userId }
				});

				if (message) {
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

		socket.on('disconnect', async () => {
			console.log(`User disconnected: ${socket.userId}`);

			await Users.findByIdAndUpdate(socket.userId, {
				status: 'offline',
				lastActive: new Date()
			});

			userSocketMap.delete(socket.userId);
			socketUserMap.delete(socket.id);
			userActiveConversations.delete(socket.userId);

			socket.broadcast.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			});
			await Typing.deleteMany({ userId: socket.userId });
		});
	});

	const isUserActiveInConversation = (userId, conversationId) => {
		return userActiveConversations.has(userId) && userActiveConversations.get(userId).has(conversationId.toString());
	}
	const markMessageAsRead = async (conversationId, userId) => {
		try {
			const unreadMessages = await Messages.find({
				conversationId,
				'readBy.user': { $ne: userId },
				sender: { $ne: userId }
			});

			for (const message of unreadMessages) {
				await Messages.findByIdAndUpdate(message._id, {
					$push: {
						readBy: {
							user: userId,
							readAt: new Date()
						}
					},
					status: 'read'
				});

				const senderSocketId = userSocketMap.get(message.sender.toString());
				if (senderSocketId) {
					io.to(senderSocketId).emit('message:read', {
						messageId: message._id,
						readBy: { user: userId, readAt: new Date() }
					});
				}
			}

			await ConversationMember.findOneAndUpdate(
				{ conversationId, memberId: userId },
				{ unreadCount: 0 }
			);

			const userSocketId = userSocketMap.get(userId);
			if (userSocketId) {
				io.to(userSocketId).emit('messages:updated', { conversationId });
			}
			return unreadMessages.length;
		} catch (error) {
			console.error('Error marking messages as read', error);
		}
	}
	const sendMessageToRecipient = async (message, recipientId) => {
		try {
			const recipientSocketId = userSocketMap.get(recipientId.toString());
			const isActive = isUserActiveInConversation(recipientId, message.conversationId.toString());

			// If user is not active in conversation and is not the sender, increment unread count
			if (!isActive && recipientId !== message.sender.toString()) {
				await ConversationMember.findOneAndUpdate(
					{ conversationId: message.conversationId, memberId: recipientId },
					{ $inc: { unreadCount: 1 } }
				);
			}

			if (recipientSocketId) {
				const populatedMessage = await Messages.findById(message._id)
					.populate('sender', 'name avatar status')
					.lean();

				// Add client-side flags
				const messageToSend = {
					...populatedMessage,
					isReadByMe: populatedMessage.readBy.some(r =>
						r.user.toString() === recipientId.toString()
					)
				};

				// Send the new message
				io.to(recipientSocketId).emit('message:new', messageToSend);

				// If user is not active in this conversation, update unread count
				if (!isActive) {
					const memberData = await ConversationMember.findOne(
						{ conversationId: message.conversationId, memberId: recipientId }
					).select('unreadCount');

					io.to(recipientSocketId).emit('conversation:unread', {
						conversationId: message.conversationId,
						unreadCount: memberData ? memberData.unreadCount : 0
					});
				}
				return true;
			}
			return false;
		} catch (error) {
			console.error(`Error sending message to recipient ${recipientId}:`, error);
			return false;
		}
	};


	const createPersonalizedSystemmessage = async ({ conversationId, actorId, action, data = {} }) => {
		try {
			const members = await ConversationMember.find({ conversationId })
				.populate('memberId', 'name')
				.lean()
				.exec();

			let actorName = 'Unknown';
			let actor = members.find(member => member.memberId._id.toString() === actorId.toString());

			if (!actor && action === 'remove_member') {
				if (data.actorInfo) {
					actor = data.actorInfo.name || 'Unknown';
				} else {
					try {
						const actorUser = await Users.findById(actorId).lean().exec();
						if (actorUser) {
							actorName = actorUser.name;
						}
					} catch (error) {
						console.error('Error getting actor info', error);
					}
				}
			}else if (actor){
				actorName = actor.memberId.name;
			}else{
				throw new Error('Actor not found in conversation');
			}

			if (!actor) {
				throw new Error('Actor not found in conversation');
			}

			const contentGroups = {};
			const messages = [];

			for (const member of members) {
				const memberId = member.memberId._id.toString();
				let content = '';

				switch (action) {
					case 'create_conversation':
						content = `Welcom to ${data.conversationName}`;
						break;

					case 'update_name':
						if (memberId.toString() === actorId.toString()) {
							content = `You changed the conversation name to ${data.newName}`;
						} else {
							content = `${actor.memberId.name} changed the conversation name to ${data.newName}`;
						}
						break;
					case 'update_avatar':
						if (memberId.toString() === actorId.toString()) {
							content = `You changed the conversation avatar`;
						} else {
							content = `${actor.memberId.name} changed the conversation avatar`;
						}
						break;
					case 'add_member':
						if (data.addedMembers && data.addedMembers.length > 0) {
							const memberNames = data.addedMembers.map(m => m.name).join(', ');

							if (memberId === actorId.toString()) {
								content = `You added ${memberNames} to the group`;
							} else if (data.addedMemberIds && data.addedMemberIds.includes(memberId)) {
								content = `You were added to the group by ${actor.memberId.name}`;
							} else {
								content = `${actor.memberId.name} added ${memberNames} to the group`;
							}
						}
						break;
					case 'remove_member':
						if (data.removedMembers && data.removedMembers.length > 0) {
							const memberNames = data.removedMembers.map(m => m.name).join(', ');
							if (memberId === actorId.toString()) {
								content = `You removed ${memberNames} from the group`;
							} else if (data.removedMemberIds && data.removedMemberIds.includes(memberId)) {
								content = `You were removed from the group by ${actor.memberId.name}`;
							} else {
								content = `${actor.memberId.name} removed ${memberNames} from the group`;
							}
						}
						break;

					case 'update_role':
						if (memberId.toString() === actorId.toString()) {
							if (data.newRole === 'admin') {
								content = `You are now an admin`;
							} else if (data.newRole === 'deputy_admin') {
								content = `You are now a deputy admin`;
							} else {
								if (data.newRole !== 'admin') {
									content = `${actor.memberId.name} is now an admin`;
								} else if (data.newRole !== 'deputy_admin') {
									content = `${actor.memberId.name} is now a deputy admin`;
								};
							}
						}
						break;
					case 'assign_deputy_admin':
						if (data.deputyMember) {
							if (memberId === actorId.toString()) {
								content = `You have assigned ${data.deputyMember.name} as deputy admin`;
							} else if (memberId === data.deputyMember.id) {
								content = `${actor.memberId.name} assigned you as deputy admin`;
							} else {
								content = `${actor.memberId.name} assigned ${data.deputyMember.name} as deputy admin`;
							}
						}
						break;
					case 'transfer_admin':
						if (data.newAdmin) {
							if (memberId === actorId.toString()) {
								content = `You have transferred admin to ${data.newAdmin.name}`;
							} else if (memberId === data.newAdmin.id) {
								content = `${actor.memberId.name} transferred admin to you`;
							} else {
								content = `${actor.memberId.name} transferred admin to ${data.newAdmin.name}`;
							}
						}
						break;
					default:
						content = `Unknown action: ${action}`;
						break;
				}
				if (content) {
					if (!contentGroups[content]) {
						contentGroups[content] = [];
					}
					contentGroups[content].push(memberId);
				}
			}
			console.log("Content groups: ", contentGroups);
			for (const [content, recipientIds] of Object.entries(contentGroups)) {
				const messageData = {
					conversationId,
					sender: actorId,
					content,
					type: 'system',
					status: 'sent',
					metaData: {
						action,
						personalizedForGroup: recipientIds,
						...data
					},
					readBy: []
				};

				for (const recipientId of recipientIds) {

					if (isUserActiveInConversation(recipientId, conversationId.toString())) {
						messageData.readBy.push({
							user: recipientId,
							readAt: new Date()
						})
					}

				}
				if (messageData.readBy.length > 0) {
					messageData.status = 'read';
				} else {
					messageData.status = 'sent'
				}
				console.log('Creating message:', messageData); // Debugging


				const message = new Messages(messageData);
				const savedMessage = await message.save();
				messages.push(savedMessage);

				await Conversations.findByIdAndUpdate(conversationId, {
					lastMessage: savedMessage._id,
					updatedAt: new Date()
				});

				for (const recipientId of recipientIds) {
					await sendMessageToRecipient(savedMessage, recipientId);
				}

			}
			return messages;
		} catch (error) {
			throw new Error(`Failed to create personalized system message: ${error.message}`);
		}
	}

	const notifyUserUpdate = async (updatedUser) => {
		try {
			io.emit('user:update', {
				user: updatedUser
			})

			io.emit('user:status', {
				userId: updatedUser._id,
				status: updatedUser.status
			})
		} catch (error) {
			console.error('Error notifying user update', error);
		}
	}

	const notifyUserCreated = async (newUser) => {
		try {
			io.emit('user:create', {
				user: newUser
			})
		} catch (error) {
			console.error('Error notifying user create', error);
		}
	}

	const sendNotification = async (notification) => {
		try {
			const newNotification = await notification.save();

			const populatedNotification = await Notifications.findById(newNotification._id)
				.populate('sender', 'name avatar')
				.populate('received', 'name avatar');

			const recipientSocketId = userSocketMap.get(notification.received.toString());

			if (recipientSocketId) {
				io.to(recipientSocketId).emit('notification:new', populatedNotification);

				const count = await Notifications.countDocuments({
					received: notification.received,
					isRead: false
				});

				io.to(recipientSocketId).emit('notification:count', { count });
			}
		} catch {
			console.error('Error sending notification', error);
		}
	};

	const sendSystemMessage = async (message) => {
		try {
			if (message.metaData && message.metaData.personalizedFor) {

				const recipientId = message.metaData.personalizedFor.toString();
				await sendMessageToRecipient(message, recipientId);
			} else if (message.metaData && message.metaData.personalizedForGroup) {
				let sentCount = 0;
				for (const recipientId of message.metaData.personalizedForGroup) {
					const sent = await sendMessageToRecipient(message, recipientId);
					if (sent) sentCount++;
				}
				console.log(`System message sent to ${sentCount}/${message.metaData.personalizedForGroup.length} members`);
			} else {
				const conversationMembers = await ConversationMember.find({
					conversationId: message.conversationId
				}).select('memberId').lean();

				let sentCount = 0;
				for (const member of conversationMembers) {

					const memberId = member.memberId.toString();
					const sent = await sendMessageToRecipient(message, memberId);
					if (sent) sentCount++;
				}
				console.log(`System message sent to ${sentCount}/${conversation.length} members`);
			}
		} catch {
			console.error('Error sending system message', error);
		}
	}

	const notifyDepartmentConversationCreated = async (conversation) => {
		try {
			const populatedConversation = await ConversationMember.find({
				conversationId: conversation._id
			}).populate('memberId', 'name avatar status').lean();

			const departmentMembers = await Users.find({
				department: conversation.departmentId
			}).select('_id').lean();

			for (const member of departmentMembers) {
				const memberSocketId = userSocketMap.get(member._id.toString());

				if (memberSocketId) {
					const socket = io.sockets.sockets.get(memberSocketId);
					if (socket) {
						socket.join(`conversation:${conversation._id}`);
					}

					io.to(memberSocketId).emit('department-conversation:created', {
						converastion: populatedConversation,
						department: {
							_id: conversation.departmentId,
							name: conversation.departmentId.name
						}
					})
				}
			}
		} catch (error) {
			console.error('Error notifying department conversation created', error);
		}
	}

	const notifyDepartmentConversationUpdated = async (conversation) => {
		try {
			const members = await ConversationMember.find({
				conversationId: conversation._id
			}).populate('memberId', 'name avatar status').lean().exec();

			const department = await Department.findById(conversation.departmentId)
				.select('_id name')
				.lean()
				.exec();

			io.to(`conversation:${conversation._id}`).emit('department-conversation:updated', {
				conversation: {
					...conversation,
					members
				},
				department: department || {
					_id: conversation.departmentId,
					name: 'Unknown'
				}
			});
		} catch (error) {
			console.error('Error notifying department conversation updated', error);
		}
	}

	const addMemberToConversation = async (conversationId, memberId) => {
		try {
			const memberSocketId = userSocketMap.get(memberId.toString());

			if (memberSocketId) {
				const socket = io.sockets.sockets.get(memberSocketId);
				if (socket) {
					socket.join(`conversation:${conversationId}`);

					const conversation = await Conversations.findById(conversationId).lean().exec();
					const members = await ConversationMember.find({
						conversationId
					}).populate('memberId', 'name avatar status').lean().exec();

					socket.emit('conversation:added', {
						conversation: {
							...conversation,
							members
						}
					});
				}
			}
		} catch (error) {
			console.error('Error adding member to conversation', error);
		}
	}

	const removeMemberFromConversation = async (conversationId, memberIds) => {
		try {
			const memberIdArray = Array.isArray(memberIds) ? memberIds : [memberIds];

			for (const memberId of memberIdArray) {
				const memberSocketId = userSocketMap.get(memberId.toString());

				if (memberSocketId) {
					const socket = io.sockets.sockets.get(memberSocketId);
					if (socket) {
						socket.leave(`conversation:${conversationId}`);
					}

					io.to(memberSocketId).emit('conversation:removed', {
						conversationId
					});
				}
			}
		} catch (error) {
			console.error('Error removing member from conversation', error);
		}
	}

	return {
		io,
		sendNotification,
		sendSystemMessage,
		createPersonalizedSystemmessage,
		markMessageAsRead,
		notifyDepartmentConversationCreated,
		notifyDepartmentConversationUpdated,
		addMemberToConversation,
		removeMemberFromConversation,
		notifyUserUpdate,
		notifyUserCreated,

	};
}

module.exports = setUpSocket;