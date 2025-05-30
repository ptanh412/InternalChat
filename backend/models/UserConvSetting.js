const mongoose = require('mongoose');

const userConvSettingSchema = {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    conversationId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    isArchived: {
		type: Boolean,
		default: false
	},
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}

const UserConvSetting = mongoose.model('UserConvSetting', userConvSettingSchema);
module.exports = UserConvSetting;