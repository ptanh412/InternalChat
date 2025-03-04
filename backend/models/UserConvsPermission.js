const mongoose = require('mongoose');

const userConversationPermissionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },

    customPermissions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
        required: true
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

userConversationPermissionSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('UserConversationPermission', userConversationPermissionSchema);