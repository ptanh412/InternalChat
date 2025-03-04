const mongoose = require('mongoose');

const userSettingSchema = new mongoose.Schema({
	userId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		unique: true
	},
	theme:{
		type: String,
		default: 'light',
		enum: ['light', 'dark']
	},
	language:{
		type: String,
		default: 'english',
		enum: ['english', 'vietnamese']
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('UserSetting', userSettingSchema);