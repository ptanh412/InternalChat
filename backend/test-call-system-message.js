// Test script for logCallSystemMessage function
const mongoose = require('mongoose');
require('dotenv').config();

// Test call object
const testCall = {
    _id: new mongoose.Types.ObjectId(),
    conversationId: new mongoose.Types.ObjectId(),
    initiator: new mongoose.Types.ObjectId(),
    participants: [
        {
            user: new mongoose.Types.ObjectId(),
            status: 'answered'
        },
        {
            user: new mongoose.Types.ObjectId(),
            status: 'answered'
        }
    ],
    status: 'completed', // or 'missed'
    type: 'video',
    duration: 125, // 2 minutes 5 seconds
    createdAt: new Date(),
    updatedAt: new Date()
};

console.log('Test call object created:');
console.log(JSON.stringify(testCall, null, 2));

// Test different call statuses
const testStatuses = ['completed', 'missed', 'declined', 'failed'];

testStatuses.forEach(status => {
    const testCallCopy = { ...testCall, status };
    
    let content = '';
    const durationMinutes = testCallCopy.duration ? Math.floor(testCallCopy.duration / 60) : 0;
    const durationSeconds = testCallCopy.duration ? testCallCopy.duration % 60 : 0;
    const durationString = testCallCopy.duration ? `${durationMinutes > 0 ? durationMinutes + 'm' : ''}${durationSeconds}s` : '0s';

    switch (testCallCopy.status) {
        case 'completed':
            content = `Call ended. Duration: ${durationString}`;
            break;
        case 'missed':
            content = `Missed ${testCallCopy.type} call.`;
            break;
        case 'declined':
            content = 'Call was declined.';
            break;
        case 'failed':
            content = 'Call failed.';
            break;
        default:
            content = `Call finished with status: ${testCallCopy.status}`;
    }

    console.log(`\nStatus: ${status}`);
    console.log(`Content: ${content}`);
    console.log(`Will emit lastMessage update: ${status === 'completed' || status === 'missed'}`);
});
