const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	sender:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	received: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	content:{
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true,
		enum: ['message', 'reaction'],
	},
	isRead:{
		type: Boolean,
		default: false
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

notificationSchema.index({createdAt: -1});
notificationSchema.index({sender: 1, isRead: 1});

module.exports = mongoose.model('Notification', notificationSchema);