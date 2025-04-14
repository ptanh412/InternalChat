const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
	original:{
		type: String,
		required: true
	},
	fileName:{
		type: String,
		required: true,
		unique: true
	},
	fileUrl:{
		type: String,
		required: true
	},
	fileType: {
		type: String,
        enum: ['image', 'video', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive'],
		default: 'other'
	},
	mimeType: String,
	fileSize: Number,
	uploadedBy:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	conversationId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Conversation',
	},
	messageId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Message',
	},
	thumbnails: String,
	uploadAt: {
		type: Date,
		default: Date.now
	},
	usedInMessage: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Message',
	}]
});

fileSchema.index({conversationId: 1});
fileSchema.index({fileType: 1});
fileSchema.index({uploadedBy: 1});


module.exports = mongoose.model('File', fileSchema);