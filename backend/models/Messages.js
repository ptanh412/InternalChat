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
			validator: function(value) {
				// Try accessing attachments from the document being validated
				return (this.get('attachments') && this.get('attachments').length > 0) || (value && value.trim().length > 0);
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
		type: mongoose.Schema.Types.ObjectId,
		ref: 'File'
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
	userPinned:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	isEdited:{
		type: Boolean,
		default: false
	},
	metadata:{
		type: mongoose.Schema.Types.Mixed,
		default: null
	},
});

// Compound index for efficient message fetching with pagination
messageSchema.index({conversationId: 1, createdAt: -1});
// Index for user-specific queries
messageSchema.index({sender: 1});
// Index for reply functionality
messageSchema.index({replyTo: 1});
// Index for pinned messages
messageSchema.index({isPinned: 1, conversationId: 1});
// Index for read status queries
messageSchema.index({readBy: 1});
// Index for recalled messages
messageSchema.index({isRecalled: 1});
// Compound index for status and conversation queries
messageSchema.index({conversationId: 1, status: 1, createdAt: -1});

messageSchema.index({conversationId: 1, createdAt: -1, _id: 1}); // Thêm _id cho cursor pagination
messageSchema.index({conversationId: 1, sender: 1, createdAt: -1}); // Tối ưu cho populate sender

messageSchema.pre('save', async function(next) {
	if (this.attachments && this.attachments.length > 0) {
		await mongoose.model('File').updateMany(
			{ _id: { $in: this.attachments } },
			{ $addToSet: { usedInMessages: this._id } }
		)
	}
});

messageSchema.pre('remove', async function(next) {
	if (this.attachments && this.attachments.length > 0) {
		await mongoose.model('File').updateMany(
			{ _id: { $in: this.attachments } },
			{ $pull: { usedInMessages: this._id } }
		)
	}
	next();
})

module.exports = mongoose.model('Message', messageSchema);