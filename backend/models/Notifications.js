const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	received: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	departmentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Department'
	},
	content: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true,
		enum: ['system', 'reaction', 'message', 'system_position_change', 'system_member_joined', 'system_member_removed'],
	},
	isRead: {
		type: Boolean,
		default: false
	},
	readBy: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}],
	createdAt: {
		type: Date,
		default: Date.now
	},
	metadata: {
		type: mongoose.Schema.Types.Mixed,
		default: null
	},
	excludeUsers: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}]
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ sender: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);