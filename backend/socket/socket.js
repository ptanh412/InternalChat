const { Server } = require('socket.io');
const socketAuth = require('../middlewares/socketAuth');
const Users = require('../models/Users');
const Typing = require('../models/Typing');
const Notifications = require('../models/Notifications');
const ConversationMember = require('../models/ConversationMember');
const Department = require('../models/Department');
const Conversations = require('../models/Conversations');
const Messages = require('../models/Messages');
const File = require('../models/File');
const messageService = require('../services/messageService');

const setUpSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: process.env.CLIENT_URL,
			methods: ['GET', 'POST']
		},
		pingTimeout: 60000,
		pingInterval: 25000
	});

	const userSocketMap = new Map();
	const socketUserMap = new Map();
	const userActiveConversations = new Map();
	const temporaryChats = new Map();
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
						}).select('conversationId');

						const initiatorConvIds = initiatorConvs.map(conv => conv.conversationId);

						const contactMemberships = await ConversationMember.find({
							memberId: contactId,
							conversationId: { $in: initiatorConvIds }
						})

						const sharedConvIds = contactMemberships.map(m => m.conversationId);

						existingConversation = await Conversations.findOne({
							_id: { $in: sharedConvIds },
							type: 'private',
						}).populate('lastMessage', 'content type createdAt attachments sentAt sender isRecalled isEdited status').lean().exec();
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
						select: 'name avatar status department position',
						populate: {
							path: 'department',
							select: 'name'
						}
					});

					if (existingConversation.lastMessage) {
						// Ensure lastMessage.sender is populated with user info
						const lastMessage = await Messages.findById(existingConversation.lastMessage._id)
							.populate({
								path: 'sender',
								select: 'name avatar'
							})
							.lean()
							.exec();

						if (lastMessage) {
							existingConversation.lastMessage = lastMessage;
						}
					}

					const conversationData = existingConversation;

					const populatedConversation = {
						...conversationData,
						members: members.map(member => member.memberId)
					};
					console.log('Existing conversation:', populatedConversation);
					socket.emit('chat:loaded', {
						conversation: populatedConversation,
						isTemporary: false
					});
					return;
				}

				if (conversationType === 'private') {
					const contactUser = await Users.findById(contactId)
						.select('name avatar status department')
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
						.select('name avatar status department')
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

					if (conversation.lastMessage) {
						await Messages.populate(conversation.lastMessage, {
							path: 'sender',
							select: 'name status'
						})
					}

					const members = await ConversationMember.find({
						conversationId: conversation._id
					}).populate({
						path: 'memberId',
						select: 'name avatar status department position',
						populate: {
							path: 'department',
							select: 'name'
						}
					});

					const populatedConversation = {
						...conversation.toObject(),
						members: members.map(member => member.memberId)
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

		socket.on('conversation:enter', async (data) => {
			try {
				const { conversationId } = data;
				console.log('Conversation received:', conversationId);

				const userIdString = socket.userId.toString();

				if (!userActiveConversations.has(userIdString)) {
					userActiveConversations.set(userIdString, new Set());
				}
				userActiveConversations.get(userIdString).add(conversationId.toString());

				const members = await ConversationMember.find({ conversationId });

				members.forEach(member => {
					const memberSocketId = userSocketMap.get(member.memberId.toString());
					if (memberSocketId && member.memberId.toString() !== socket.userId.toString()) {
						io.to(memberSocketId).emit('user:entered', {
							conversationId,
							userId: socket.userId
						});
					}
				})
				const readResult = await markMessageAsRead(conversationId, socket.userId);
				members.forEach(member => {
					const memberSocketId = userSocketMap.get(member.memberId.toString());
					if (memberSocketId && member.memberId.toString() !== socket.userId.toString()) {
						io.to(memberSocketId).emit('conversation:read', {
							conversationId,
							readBy: readResult.readBy
						});
					}
				})
				console.log('User entered conversation:', {
					userId: userIdString,
					conversationId,
					activeConversations: userActiveConversations.get(userIdString)
				});
			} catch (error) {
				console.error('Error entering conversation', error);
			}
		});

		socket.on('conversation:leave', async (data) => {
			const { conversationId } = data;
			const userIdString = socket.userId.toString();

			if (userActiveConversations.has(userIdString)) {
				userActiveConversations.get(userIdString).delete(conversationId.toString());
			}

			console.log('User left conversation:', {
				userId: userIdString,
				conversationId,
				activeConversations: userActiveConversations.get(userIdString)
			})
		})

		socket.on('conversation:mark-read', async (data) => {
			try {
				const { conversationId } = data;

				const result = await markMessageAsRead(conversationId, socket.userId);

				// console.log('Marking conversation as read:', result.readBy);

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
							readBy: result.readBy
						});
					}
				})
			} catch (error) {
				console.error('Error marking conversation as read', error);
			}
		})

		socket.on('send:message', async (data) => {
			try {
				let { conversationId, content, type, replyTo, attachments, tempId } = data;
				let newConversation = null;

				if (conversationId.startsWith('temp_')) {
					const tempChatInfo = temporaryChats.get(conversationId);
					if (!tempChatInfo) {
						throw new Error('Temporary chat not found');
					}

					const { newConversation: createdConversation, members } = await createConversation(tempChatInfo, socket.userId);
					conversationId = createdConversation._id.toString();

					temporaryChats.delete(originalTempId);

					socket.emit('chat:created', {
						oldId: conversationId,
						newConversation: {
							...createdConversation.toObject(),
							members
						}
					})
				}

				const isMember = await ConversationMember.findOne({
					conversationId,
					memberId: socket.userId
				});

				if (!isMember) {
					throw new Error('You are not a member of this conversation');
				}

				const messageData = {
					conversationId,
					sender: socket.userId,
					content,
					type: attachments.length > 0 ? 'multimedia' : type,
					replyTo,
					attachments,
					tempId
				}
				const populatedMessage = await messageService.createMessage({ messageData });
				const fullyPopulatedMessage = await Messages.findById(populatedMessage._id)
					.populate('sender', 'name avatar status')
					.populate('replyTo', 'content sender')
					.lean();

				const members = await ConversationMember.find({
					conversationId
				});

				const activeRecipients = [];
				await Conversations.findByIdAndUpdate(
					conversationId,
					{lastMessage: populatedMessage._id},
					{new: true}
				)
				for (const member of members) {
					const memberId = member.memberId.toString();
					if (memberId  === socket.userId.toString()) continue;
					const isActive = isUserActiveInConversation(memberId, conversationId.toString());
					if (isActive) {
						activeRecipients.push(memberId);
					}
					await sendMessageToRecipient(populatedMessage, memberId);
					// if (member.memberId.toString() !== socket.userId.toString()) {
					// 	const isActive = isUserActiveInConversation(
					// 		member.memberId.toString() || member.memberId._id.toString(),
					// 		conversationId.toString()
					// 	)
					// 	if (isActive) {
					// 		activeRecipients.push(member.memberId.toString())
					// 	}
					// 	await sendMessageToRecipient(populatedMessage, member.memberId);
					// }
				}
				console.log('Mesage sent:', fullyPopulatedMessage.conversationId);
				const messageStatus = activeRecipients.length > 0 ? 'read' : 'sent';
				socket.emit('message:new', {
					conversationId: fullyPopulatedMessage.conversationId,
					message: {
						...fullyPopulatedMessage,
						status: messageStatus
					}
				})
				const senderSocketId = userSocketMap.get(socket.userId.toString());
				if (senderSocketId) {
					socket.emit('message:sent', {
						success: true,
						message: {
							...fullyPopulatedMessage,
							status: messageStatus
						},
						tempId,
						conversationId: conversationId
					});
				}
			} catch (error) {
				console.error('Error sending message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		});

		// if (newConversation) {
		// 	const tempChatInfo = temporaryChats.get(originalTempId);
		// 	if (tempChatInfo) {
		// 		const recipientSocketId = userSocketMap.get(tempChatInfo.contactId.toString());

		// 		if (recipientSocketId) {
		// 			const fullConv = await Conversations.findById(data.conversationId).lean();
		// 			const members = await ConversationMember.find({
		// 				conversationId: data.conversationId
		// 			}).populate('memberId', 'name avatar status');

		// 			io.to(recipientSocketId).emit('chat:new', {
		// 				conversation: {
		// 					...fullConv,
		// 					members: members.map(member => member.memberId)
		// 				},
		// 				message: populatedMessage
		// 			})
		// 		}
		// 	}
		// } else {
		// 	const fullConv = await Conversations.findById(data.conversationId).lean();

		// 	const populatedConversation = {
		// 		...fullConv,
		// 		members: conversationMembers.map(member => member.memberId)
		// 	}

		// 	for (const member of members) {
		// 		const recipientSocketId = userSocketMap.get(member.memberId.toString());
		// 		if (recipientSocketId) {
		// 			io.to(recipientSocketId).emit('chat:new', {
		// 				conversation: populatedConversation,
		// 				message: populatedMessage
		// 			})
		// 		}
		// 	}
		// }
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

				await Conversations.findByIdAndUpdate(
					populatedMessage.conversationId,
					{ lastMessage: populatedMessage._id }
				)
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
				// socket.emit('message:new', {
				// 	conversationId: populatedMessage.conversationId.toString(),
				// 	message: {
				// 		...populatedMessage,
				// 		status: activeRecipients.length > 0 ? 'read' : 'sent'
				// 	}
				// });
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
		socket.on('recall:message', async (data) => {
			try {
				const { messageId, recallType } = data;
				const recalledMessage = await messageService.recallMessage({ messageId, userId: socket.userId, recallType });

				socket.emit('message:recall-success', {
					success: true,
					message: recalledMessage.messageId,
					conversationId: recalledMessage.conversationId,
					recallType: recalledMessage.recallType
				});
			} catch (error) {
				console.error('Error recalling message', error);
				socket.emit('message:error', {
					error: error.message,
					tempId: data.tempId
				})
			}
		})

		socket.on('message:reaction', async (data) => {
			console.log('Received message:reaction event:', data);
			try {
				const { messageId, emoji } = data;
				const updatedMessage = await messageService.reactToMessage({ messageId, userId: socket.userId, emoji });
				console.log('Updated message after reaction:', updatedMessage);
				socket.emit('message:react-success', {
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
				socket.emit('message:react-success', {
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
			const userIdString = socket.userId.toString();
			if (userActiveConversations.has(userIdString)) {
				userActiveConversations.delete(userIdString);
			}
			userSocketMap.delete(socket.userId.toString());
			socketUserMap.delete(socket.id);
			socket.broadcast.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			});
			await Typing.deleteMany({ userId: socket.userId });
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

	const createConversation = async (data, initiatorId) => {
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
		await ConversationMember.insertMany(memberData);
		const members = await ConversationMember.find({
			conversationId: newConversation._id
		}).populate('memberId', 'name avatar status');

		return {
			newConversation,
			members: members.map(member => member.memberId)
		}
	}

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

			if (!recipientSocketId) {
				console.error(`Recipient ${recipientId} is not connected`);
				return false;
			};

			try {
				const [
					populatedMessage,
					conversation,
					members,
					userMember
				] = await Promise.all([
					Messages.findById(message._id)
						.populate('sender', 'name avatar status')
						.populate({
							path: 'replyTo',
							select: 'content sender',
							populate: {
								path: 'sender',
								select: 'name avatar status'
							}
						})
						.lean(),
					Conversations.findById(message.conversationId)
						.populate({
							path: 'lastMessage',
							select: 'content type createdAt attachments sentAt sender isRecalled isEdited',
							populate: {
								path: 'sender',
								select: 'name avatar status',
							}
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

				const isSenderActive = isUserActiveInConversation(message.sender._id.toString(), message.conversationId.toString());
				const isRecipientActive = isUserActiveInConversation(recipientId.toString(), message.conversationId.toString());

				console.log('Message sender active:', message.sender._id.toString());
				console.log('Conversation ID:', message.conversationId.toString());
				console.log('Message recipient active:', recipientId.toString());
				console.log('Sender active:', isSenderActive, 'Recipient active:', isRecipientActive);

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
					console.log('Mesaages marked as read for recipient:', readResult);
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
					select: 'content type createdAt attachments sentAt sender isRecalled isEdited',
					populate: {
						path: 'sender',
						select: 'name avatar status',
					}
				}).lean();
				const fullMessagePayload = {
					conversationId: conversationIdString,
					message: populatedMessage,
					conversation: {
						...updatedConversation,
						members: members,
						lastMessage: populatedMessage
					},
					unreadCount: currentUnreadCount
				};
				console.log('Emiiting message:new to', recipientSocketId, fullMessagePayload);
				io.to(recipientSocketId).emit('message:new', fullMessagePayload);

				console.log('Emission completed for recipient');
				if(isRecipientActive){
					io.to(recipientSocketId).emit('conversation:update',{
						conversationId: message.conversationId,
						lastMessage: populatedMessage
					})
				}

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
			} else if (actor) {
				actorName = actor.memberId.name;
			} else {
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
					case 'recall_message':
						if (data.recallType === 'everyone') {
							if (memberId.toString() === actorId.toString()) {
								content = `You recalled a message for everyone`;
							} else {
								content = `${actor.memberId.name} recalled a message`;
							}
						} else if (data.recallType === 'self' && memberId.toString() === actorId.toString()) {
							content = `You recalled a message`;
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
		userSocketMap,
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
		sendMessageToRecipient
	};
}

module.exports = setUpSocket;