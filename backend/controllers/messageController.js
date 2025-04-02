const messageService = require('../services/messageService');

const create = async (req, res) =>{
    try{
        const {conversationId, content, type = 'text', replyTo, tempId} = req.body;

        if(!conversationId){
            throw new Error('Conversation ID is required');
        }

        if (replyTo && !replyTo._id) {
            throw new Error('ReplyTo message ID is required');
        }

        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => {
                return {
                    fileName: file.originalname,
                    fileUrl: file.path,
                    fileType: file.fileType,
                    mimeType: file.mimetype,
                    fileSize: file.size
                }
            });
        }

        const message = await messageService.createMessage({
            conversationId,
            sender: req.user._id,
            content,
            type: attachments.length > 0 ? 'multimedia' : type,
            replyTo,
            attachments,
            tempId
        })

        return res.status(201).send(message);
    }catch(error){
        res.status(400).send({message: error.message});
    }
}

const edit = async (req, res) =>{
    try {
        const {messageId} = req.params;
        const {content} = req.body;

        if (!messageId) {
            throw new Error('Message ID is required');
        }

        const message = await messageService.editMessage(messageId, req.user._id, content);

        if (!message) {
            throw new Error('Message not found');
        }

        return res.status(200).send(message);
    }catch(error){
        res.status(400).send({message: error.message});
    }
}

const recall = async (req, res) =>{
    try {
        const {messageId} = req.params;
        const {recallType} = req.body;

        if (!messageId) {
            throw new Error('Message ID is required');
        }

        const message = await messageService.recallMessage(messageId,req.user._id, recallType);

        if (!message) {
            throw new Error('Message not found');
        }

        return res.status(200).send(message);
    }catch(error){
        res.status(400).send({message: error.message});
    }
}

const react = async (req, res) =>{
    try {
        const {messageId} = req.params;
        const {emoji} = req.body;

        if (!messageId) {
            throw new Error('Message ID is required');
        }

        if (!emoji) {
            throw new Error('Emoji is required');
        }

        const message = await messageService.reactToMessage(messageId, req.user._id, emoji);

        if (!message) {
            throw new Error('Message not found');
        }

        return res.status(200).send(message);
    }catch(error){
        res.status(400).send({message: error.message});
    }
}

const getMessageByConv = async (req, res) =>{
    try {
        const {conversationId} = req.params;

        if (!conversationId) {
            throw new Error('Conversation ID is required');
        }

        const messages = await messageService.getMessageByConversationId(conversationId);

        return res.status(200).json({
            success: true,
            data: messages
        });
    }catch(error){
        res.status(400).send({message: error.message});
    }
}

module.exports = {
    create,
    edit,
    recall,
    react,
    getMessageByConv
}