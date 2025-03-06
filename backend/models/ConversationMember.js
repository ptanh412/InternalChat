const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role:{
        type: String,
        required: true,
        enum: ['admin', 'member', 'deputy_admin'],
    },
    permissions:{
        canChat: {
            type: Boolean,
            default: true
        },
        canAddMembers: {
            type: Boolean,
            default: false
        },
        canRemoveMembers: {
            type: Boolean,
            default: false
        },
        canEditConversation: {
            type: Boolean,
            default: false
        },
        canAssignDeputies:{
            type: Boolean,
            default: false
        }
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
});

conversationMemberSchema.index({
    conversationId: 1,
    memberId: 1
}, {unique: true});

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);