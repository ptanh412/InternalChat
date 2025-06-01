const ConversationMember = require("../models/ConversationMember");
const socketService = require("./socketService");
const Messages = require('../models/Messages');
const Conversations = require("../models/Conversations");
const fileService = require("./fileService");
const File = require("../models/File");
const encryptionService = require("../utils/encryptionMsg");

const createSystemMessage = async ({ conversationId, sender, content, metaData = {} }) => {
    try {
        const systemMessage = new Messages({
            conversationId,
            sender,
            content,
            type: 'system',
            metaData
        })

        const savedMessage = await systemMessage.save();
        await socketService.getSocket().sendSystemMessage(savedMessage);

        return savedMessage;
    } catch (error) {
        throw new Error(`Failed to create system message: ${error.message}`);
    }
}

const createMessage = async ({ messageData }) => {
    console.log('Creating message:', messageData);
    try {
         const isMember = await ConversationMember.findOne({
            conversationId: messageData.conversationId,
            memberId: messageData.sender
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
        };

        let canSendMessage = isMember.permissions.canChat;

        if (!canSendMessage) {
            let hasManageDepartmentPermission = false;

            if (isMember.memberId.role.permissions.manageDepartment){
                hasManageDepartmentPermission  =true;
            }else if (isMember.memberId.role && isMember.memberId.role.permissions && isMember.memberId.role.permissions.manageDepartment) {
                hasManageDepartmentPermission = false;
            }

            if (hasManageDepartmentPermission){
                canSendMessage = true;
            }
        }

        if (!canSendMessage){
            throw new Error('You do not have permission to send messages in this conversation');
        }
      

        let processAttachments = [];

        if (messageData.attachments && messageData.attachments.length > 0) {
            processAttachments = await fileService.processAttachments(
                messageData.attachments,
                messageData.sender,
                messageData.conversationId
            )
        }
        const message = new Messages({
            ...messageData,
            attachments: processAttachments,
            type: processAttachments.length > 0 ? 'multimedia' : messageData.type,

        });
        await message.save();

        console.log('Processed attachments:', processAttachments);

        if (processAttachments.length > 0) {
            await fileService.associateFilesWithMessage(processAttachments, message._id);
        }
        
        await Conversations.findByIdAndUpdate(messageData.conversationId, {
            lastMessage: message._id,
            updatedAt: new Date()
        });

        return await Messages.findById(message._id)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate({
                path: 'attachments',
                select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
            })
            .lean();
    } catch (error) {
        throw new Error(`Failed to create message: ${error.message}`);
    }
}

const replyMessage = async ({ messageId, userId, content }) => {
    try {
        console.log('Replying to message:', { messageId, userId, content });
        const message = await Messages.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        };

        const isMember = await ConversationMember.findOne({
            conversationId: message.conversationId,
            memberId: userId
        });

        if (!isMember) {
            throw new Error('You are not a member of this conversation');
        }

        const replyMessage = new Messages({
            content,
            sender: userId,
            conversationId: message.conversationId,
            replyTo: message._id
        });

        await replyMessage.save();

        const updatedMessage = await Messages.findById(replyMessage._id)
            .populate('sender', 'name avatar status')
            .populate({
                path: 'replyTo',
                select: 'content sender',
                populate: [{
                    path: 'sender',
                    select: 'name avatar status'
                }, {
                    path: 'attachments',
                    select: 'fileName fileUrl fileType mimeType fileSize thumbnails'
                }]
            })
            .lean();
        return updatedMessage;
    } catch (error) {
        throw new Error(`Failed to reply message: ${error.message}`);
    }
}

const editMessage = async ({ messageId, userId, content }) => {
    try {
        const message = await Messages.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            throw new Error('Message not found');
        };

        const messageAge = (Date.now() - message.createdAt) / 1000 / 60;

        if (messageAge > 60) {
            throw new Error('Message is too old to edit');
        }

        message.content = content;
        message.isEdited = true;
        message.updatedAt = new Date();
        await message.save();

        const updatedMessage = await Messages.findById(messageId)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .lean();

        const members = await ConversationMember.find({ conversationId: message.conversationId });

        for (const member of members) {
            const recipientSocketId = userSocketMap.get(member.memberId.toString());
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('message:edited', updatedMessage);
            }
        };
        return updatedMessage;
    } catch (error) {
        throw new Error(`Failed to edit message: ${error.message}`);
    }
}

const pinnedMessage = async ({ messageId, userId }) => {
    try {
        const message = await Messages.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            throw new Error('Message not found');
        };
        
        message.isPinned = true;
        message.userPinned = userId;
        message.updatedAt = new Date();
        await message.save();
       
        return {
            messageId: message._id,
            conversationId: message.conversationId,
            isPinned: message.isPinned,
            userPinned: message.userPinned,
        }
    } catch (error) {
        throw new Error(`Failed to pin message: ${error.message}`);
    }
}

const unpinnedMessage = async ({ messageId, userId }) => {
    console.log('Unpinning message:', { messageId, userId });
    try {
        const message = await Messages.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            throw new Error('Message not found');
        };
        
        message.isPinned = false;
        message.userPinned = userId;
        message.updatedAt = new Date();
        await message.save();
        
        return {
            messageId: message._id,
            conversationId: message.conversationId,
            isPinned: message.isPinned,
            userPinned: message.userPinned,
        }
    } catch (error) {
        throw new Error(`Failed to unpin message: ${error.message}`);
    }
}

const recallMessage = async ({ messageId, userId, recallType }) => {
    try {
        const message = await Messages.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            throw new Error('Message not found');
        };

        if (message.sender.toString() !== userId.toString()) {
            throw new Error('You can only recall your own messages');
        }
        message.isRecalled = true;
        message.recallType = recallType;
        message.updatedAt = new Date();
        await message.save();

        const conversation = await Conversations.findById(message.conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        return {
            messageId: message._id,
            conversationId: message.conversationId,
            isRecalled: message.isRecalled,
            recallType
        }
    } catch (error) {
        throw new Error(`Failed to recall message: ${error.message}`);
    }
}

const reactToMessage = async ({ messageId, userId, emoji }) => {
    console.log('Reacting to message:', { messageId, userId, emoji });
    try {
        const message = await Messages.findOne({
            _id: messageId
        });

        if (!message) {
            throw new Error('Message not found');
        };

        const isMember = await ConversationMember.findOne({
            conversationId: message.conversationId,
            memberId: userId
        });

        if (!isMember) {
            throw new Error('You are not a member of this conversation');
        }

        const validEmojis = ['❤️', '👍', '😮', '😠', '😢', '✅', '❌', '📌'];
        if (!validEmojis.includes(emoji)) {
            throw new Error('Invalid emoji');
        }
        message.reactions.push({
            emoji,
            user: userId,
            count: 1,
            createdAt: new Date()
        });

        await message.save();

        const updatedMessage = await Messages.findById(messageId)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate('reactions.user', 'name avatar')
            .lean();
        return updatedMessage;
    } catch (error) {
        throw new Error(`Failed to react to message: ${error.message}`);
    }
}

const removeReaction = async ({ messageId, userId, emoji }) => {
    try {
        const message = await Messages.findOne({
            _id: messageId
        });

        if (!message) {
            throw new Error('Message not found');
        };

        const isMember = await ConversationMember.findOne({
            conversationId: message.conversationId,
            memberId: userId
        });

        if (!isMember) {
            throw new Error('You are not a member of this conversation');
        }

        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId.toString() && r.emoji === emoji
        )

        if (existingReactionIndex !== -1) {
            message.reactions.splice(existingReactionIndex, 1); // Xóa reaction cũ
        } else {
            throw new Error('Reaction not found');
        }

        await message.save();

        const updatedMessage = await Messages.findById(messageId)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate('reactions.user', 'name avatar')
            .lean();
        return updatedMessage;
    } catch (error) {
        throw new Error(`Failed to remove reaction: ${error.message}`);
    }
}

const getMessageByConversationId = async (conversationId, { page = 1, limit = 1000, before = null } = {}) => {
    try {
        let query = { conversationId };
        
        // If 'before' timestamp is provided, get messages before that time
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Messages.find(query)
            .sort({ createdAt: -1 }) // Most recent first
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate('attachments', 'fileName fileUrl fileType mimeType fileSize thumbnails')
            .populate('reactions.user', 'name avatar')
            .populate('readBy.user', 'name avatar status')
            .lean();

        // Get total count for pagination info
        const totalMessages = await Messages.countDocuments({ conversationId });
        
        // Decrypt messages before returning to client
        const decryptedMessages = messages.map(message => {
            const decryptedMessage = {
                ...message,
                content: message.content ? encryptionService.decryptMessage(message.content, conversationId) : message.content,
                attachments: message.attachments ? message.attachments.map(attachment => ({
                    ...attachment,
                    fileName: attachment.fileName ? encryptionService.decryptFileName(attachment.fileName, conversationId) : attachment.fileName
                })) : []
            };

            // Also decrypt replyTo message content if it exists
            if (decryptedMessage.replyTo && decryptedMessage.replyTo.content) {
                decryptedMessage.replyTo.content = encryptionService.decryptMessage(
                    decryptedMessage.replyTo.content,
                    conversationId
                );
            }

            return decryptedMessage;
        });

        // Reverse to get chronological order (oldest first)
        const sortedMessages = decryptedMessages.reverse();
        
        return {
            messages: sortedMessages,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit),
                totalMessages,
                hasMore: (page * limit) < totalMessages,
                limit
            }
        };
    } catch (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
    }
};

const getRecentMessages = async (conversationId, limit = 20) => {
    try {
        const messages = await Messages.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate('attachments', 'fileName fileUrl fileType mimeType fileSize thumbnails')
            .populate('reactions.user', 'name avatar')
            .populate('readBy.user', 'name avatar status')
            .lean();

        // Decrypt messages before returning to client
        const decryptedMessages = messages.map(message => {
            const decryptedMessage = {
                ...message,
                content: message.content ? encryptionService.decryptMessage(message.content, conversationId) : message.content,
                attachments: message.attachments ? message.attachments.map(attachment => ({
                    ...attachment,
                    fileName: attachment.fileName ? encryptionService.decryptFileName(attachment.fileName, conversationId) : attachment.fileName
                })) : []
            };

            // Also decrypt replyTo message content if it exists
            if (decryptedMessage.replyTo && decryptedMessage.replyTo.content) {
                decryptedMessage.replyTo.content = encryptionService.decryptMessage(
                    decryptedMessage.replyTo.content,
                    conversationId
                );
            }

            return decryptedMessage;
        });

        // Reverse to get chronological order (oldest first)
        return decryptedMessages.reverse();
    } catch (error) {
        throw new Error(`Failed to get recent messages: ${error.message}`);
    }
};

const getMessagesByConversationOptimized = async (conversationId, { limit = 50, cursor = null, loadRecent = true } = {}) => {
    try {
        let query = { conversationId };
        
        // Cursor-based pagination thay vì offset-based
        if (cursor) {
            if (loadRecent) {
                query._id = { $lt: cursor };
            } else {
                query._id = { $gt: cursor };
            }
        }

        // Sử dụng aggregation pipeline để tối ưu performance
        const pipeline = [
            { $match: query },
            { $sort: loadRecent ? { createdAt: -1, _id: -1 } : { createdAt: 1, _id: 1 } },
            { $limit: limit },
            
            // Lookup optimized - chỉ lấy các field cần thiết
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender',
                    foreignField: '_id',
                    as: 'sender',
                    pipeline: [
                        { $project: { name: 1, avatar: 1, status: 1 } }
                    ]
                }
            },
            { $unwind: '$sender' },
            
            // Reply lookup - conditional
            {
                $lookup: {
                    from: 'messages',
                    localField: 'replyTo',
                    foreignField: '_id',
                    as: 'replyTo',
                    pipeline: [
                        { $project: { content: 1, sender: 1 } },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'sender',
                                foreignField: '_id',
                                as: 'sender',
                                pipeline: [{ $project: { name: 1 } }]
                            }
                        },
                        { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            { $unwind: { path: '$replyTo', preserveNullAndEmptyArrays: true } },
            
            // Attachments lookup
            {
                $lookup: {
                    from: 'files',
                    localField: 'attachments',
                    foreignField: '_id',
                    as: 'attachments',
                    pipeline: [
                        { $project: { fileName: 1, fileUrl: 1, fileType: 1, mimeType: 1, fileSize: 1, thumbnails: 1 } }
                    ]
                }
            }
        ];

        const messages = await Messages.aggregate(pipeline);
        
        // Decrypt messages
        const decryptedMessages = messages.map(message => {
            const decryptedMessage = {
                ...message,
                content: message.content ? encryptionService.decryptMessage(message.content, conversationId) : message.content,
                attachments: message.attachments ? message.attachments.map(attachment => ({
                    ...attachment,
                    fileName: attachment.fileName ? encryptionService.decryptFileName(attachment.fileName, conversationId) : attachment.fileName
                })) : []
            };

            if (decryptedMessage.replyTo && decryptedMessage.replyTo.content) {
                decryptedMessage.replyTo.content = encryptionService.decryptMessage(
                    decryptedMessage.replyTo.content,
                    conversationId
                );
            }

            return decryptedMessage;
        });

        // Reverse if loading recent messages to get chronological order
        if (loadRecent) {
            decryptedMessages.reverse();
        }
        
        return {
            messages: decryptedMessages,
            hasMore: messages.length === limit,
            nextCursor: messages.length > 0 ? messages[messages.length - 1]._id : null
        };
    } catch (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
    }
};

// 3. Tối ưu Controller với streaming response
const getMessageByConvOptimized = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, cursor, loadRecent = 'true' } = req.query;

        if (!conversationId) {
            throw new Error('Conversation ID is required');
        }

        const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
        const isLoadRecent = loadRecent === 'true';

        const result = await messageService.getMessagesByConversationOptimized(conversationId, {
            limit: limitNum,
            cursor: cursor || null,
            loadRecent: isLoadRecent
        });

        // Streaming response cho large datasets
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });

        const responseData = {
            success: true,
            data: result.messages,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.messages.length
        };

        res.write(JSON.stringify(responseData));
        res.end();
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getMultimediaMessages = async (limit = 50) => {
    try {
        const messages = await Messages.find({
            type: 'multimedia',
            attachments: { $exists: true, $ne: [] }
        })
        .populate('sender', 'name email avatar')
        .populate('conversationId', 'name avatarGroup type')
        .populate('attachments')
        .sort({ createdAt: -1 })
        .limit(limit);

        return messages;
    } catch (error) {
        console.error("Error getting multimedia messages:", error);
        throw error;
    }
};

module.exports = {
    createSystemMessage,
    pinnedMessage,
    unpinnedMessage,
    createMessage,
    editMessage,
    recallMessage,
    reactToMessage,
    replyMessage,
    removeReaction,
    getMessageByConversationId,
    getRecentMessages,
    getMessagesByConversationOptimized,
    getMessageByConvOptimized,
    getMultimediaMessages
}