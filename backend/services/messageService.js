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

const getMessageByConversationId = async (conversationId) => {
    try {
        const messages = await Messages.find({ conversationId })
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
        
        return decryptedMessages; 
    } catch (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
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
    getMessageByConversationId
}