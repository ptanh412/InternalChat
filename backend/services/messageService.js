const ConversationMember = require("../models/ConversationMember");
const socketService = require("./socketService");
const Messages = require('../models/Messages');
const Conversations = require("../models/Conversations");
const fileService = require("./fileService");
const File = require("../models/File");

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
        });

        if (!isMember) {
            throw new Error('You are not a member of this conversation');
        };

        if (!isMember.permissions.canChat) {
            throw new Error('You do not have permission to chat in this conversation');
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
        const members = await ConversationMember.find({ conversationId: message.conversationId });
        for (const member of members) {
            const recipientSocketId = socketService.getSocket().userSocketMap.get(member.memberId.toString());
            if (recipientSocketId) {
                socketService.getSocket().io.to(recipientSocketId).emit('message:reply-success', {
                    messageId: replyMessage._id,
                    conversationId: message.conversationId,
                    replyTo: message.replyTo,
                    sender: updatedMessage.sender,
                    content: updatedMessage.content,
                    senAt: updatedMessage.createdAt,
                });
            }
        };
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

        const members = await ConversationMember.find({ conversationId: message.conversationId });
        console.log('Members:', members);

        for (const member of members) {
            const recipientSocketId = socketService.getSocket().userSocketMap.get(member.memberId.toString());
            console.log('Recipient Socket ID:', recipientSocketId);
            if (recipientSocketId) {
                socketService.getSocket().io.to(recipientSocketId).emit('message:react-success', {
                    messageId: message._id,
                    conversationId: message.conversationId,
                    reactions: updatedMessage.reactions,
                    emoji
                });
            }
        }
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

        const members = await ConversationMember.find({ conversationId: message.conversationId });
        for (const member of members) {
            const recipientSocketId = socketService.getSocket().userSocketMap.get(member.memberId.toString());
            if (recipientSocketId) {
                socketService.getSocket().io.to(recipientSocketId).emit('message:react-success', {
                    messageId: message._id,
                    conversationId: message.conversationId,
                    reactions: updatedMessage.reactions,
                    emoji
                });
            }
        }
        return updatedMessage;
    } catch (error) {
        throw new Error(`Failed to remove reaction: ${error.message}`);
    }
}

const getMessageByConversationId = async (conversationId) => {
    try {
        const messages = await Messages.find({ conversationId })
            .populate('sender', 'name avatar status')
            .populate('replyTo', 'content sender')
            .populate('attachments', 'fileName fileUrl fileType mimeType fileSize thumbnails')
            .populate('reactions.user', 'name avatar')
            .populate('readBy.user', 'name avatar status')
            .lean();
        return messages; 
    } catch (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
    }
};
module.exports = {
    createSystemMessage,
    createMessage,
    editMessage,
    recallMessage,
    reactToMessage,
    replyMessage,
    removeReaction,
    getMessageByConversationId
}