const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
	conversationId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Conversation',
		required: true
	},
	sender:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	content:{
		type: String,
		default: '',
		validate:{
			validator: function(value){
				return this.attachments && this.attachments.length === 0 || (value && value.trim().length > 0);
			},
			message: 'Message content cannot be empty'
		}
	},
	reactions: [{
		emoji: {
            type: String,
            enum: ['❤️', '👍', '😮', '😠', '😢', '✅', '❌', '📌'],
			count:{
				type: Number,
				default: 1
			},
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
	}],
	type: {
		type: String,
		enum: ['text', 'multimedia', 'system'],
		default: 'text'
	},
	status: {
		type: String,
		enum: ['sent', 'read'],
		default: 'sent'
	},
	sentAt:{
		type: Date,
		default: Date.now
	},
	attachments: [{
		fileName: String,
        fileUrl: String,
        fileType: {
            type: String,
            enum: ['image', 'video', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive', 'raw', 'other'],
            default: 'other'
        },
        mimeType: String,
        fileSize: Number,
	}],
	readBy:[{
		user:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		readAt:{
			type: Date,
			default: Date.now
		}
	}],
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	},
	tempId: {
		type: String,
		unique: true,
		sparse: true
	},
	replyTo:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Message'	
	},
	isRecalled: {
		type: Boolean,
		default: false
	},
	recallType:{
		type: String,
		enum: ['everyone', 'self'],
	},
	isPinned: {
		type: Boolean,
		default: false
	},
	isEdited:{
		type: Boolean,
		default: false
	}
});

messageSchema.index({conversationId: 1, createdAt: 1});
messageSchema.index({sender: 1});
messageSchema.index({replyTo: 1});
messageSchema.index({isPinned: 1});

module.exports = mongoose.model('Message', messageSchema);