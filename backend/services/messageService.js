const ConversationMember = require("../models/ConversationMember");
const socketService = require("./socketService");
const Messages = require('../models/Messages');
const Conversations = require("../models/Conversations");


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

module.exports = {
    createSystemMessage,
}