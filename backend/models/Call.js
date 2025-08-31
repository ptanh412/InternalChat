const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['invited', 'ringing', 'answered', 'declined', 'no_answer', 'left'],
        default: 'invited'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date,
        default: null
    }
}, {_id: false});

const callSchema = new mongoose.Schema({
    conversationId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    initiator:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['voice', 'video'],
        required: true
    },
    status:{
        type: String,
        enum: ['started', 'completed', 'missed', 'declined', 'failed'],
        default: 'started',
        index: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0
    },
    participants: [participantSchema],
    metadata:{
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {timestamps: true});

callSchema.index({startTime: 1});

callSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed' && this.startTime && this.endTime) {
        // Additional safety check to ensure dates are valid
        const startTime = this.startTime instanceof Date ? this.startTime : new Date(this.startTime);
        const endTime = this.endTime instanceof Date ? this.endTime : new Date(this.endTime);
        
        if (startTime && endTime && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            this.duration = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
        }
    }
    next();
});

module.exports = mongoose.model('Call', callSchema);