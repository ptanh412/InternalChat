const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
	isVisible:{
		type: Boolean,
		default: true
	},
	type: {	
		type: String,
		required: true,
		enum: ['private', 'group', 'department'],
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
		ref: 'Message',
	},
	departmentId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Department',
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

conversationSchema.index({
	type: 1,
	creator: 1,
	departmentId: 1,
});

module.exports = mongoose.model('Conversation', conversationSchema);