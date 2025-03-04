const mongoose = require('mongoose');

const typingSchema = new mongoose.Schema({
	userId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	conversationId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Conversation',
		required: true,
	},
	timestamp: {
		type: Date,
		default: Date.now,
		expires: 10
	}
});

typingSchema.index({userId: 1, conversationId: 1}, {unique: true});

module.exports = mongoose.model('Typing', typingSchema);