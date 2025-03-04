const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
	isVisble:{
		type: Boolean,
		default: true
	},
	type: {
		type: String,
		required: true,
		enum: ['private', 'group', 'department'],
	},
	participants: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	}],
	participantUnreadcount: {
		type: Map,
		of: Number,
		default: ()	=> new Map(),
	},
	name:{
		type: String,
		default: ''
	},
	avatarGroup: {
        type: String,
        default: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
    },
	creator:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	lastMessage:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Messages',
	},
	departmentId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Department',
	},
	pinned: {
		type: Boolean,
		default: false
	},
	isArchived: {
		type: Boolean,
		default: false
	},
	permissionSettings:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Permissions'
	},
	admins: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
	}],
	deputyadmins: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
	}],
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

conversationSchema.index({participants: 1});
conversationSchema.index({type: 1});
conversationSchema.index({creator: 1});
conversationSchema.index({deparmentId: 1});
conversationSchema.index({permissionSettings: 1});

module.exports = mongoose.model('Conversation', conversationSchema);