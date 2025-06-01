const mongoose = require('mongoose');
require('dotenv').config();
const Message = require('./models/Messages');
const File = require('./models/File');

async function checkAttachments() {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/InternalChat');
        console.log('Connected to MongoDB');
        
        // Check total messages
        const totalMessages = await Message.countDocuments();
        console.log('Total messages:', totalMessages);
        
        // Check messages with attachments
        const messagesWithAttachments = await Message.find({ 
            attachments: { $exists: true, $not: { $size: 0 } } 
        });
        console.log('Messages with attachments:', messagesWithAttachments.length);
        
        if (messagesWithAttachments.length > 0) {
            for (let i = 0; i < Math.min(5, messagesWithAttachments.length); i++) {
                const msg = messagesWithAttachments[i];
                console.log(`Message ${i + 1}:`);
                console.log('  ID:', msg._id);
                console.log('  Attachment IDs:', msg.attachments);
                console.log('  Content:', msg.content);
                console.log('  ---');
            }
        }
        
        // Check files in File collection
        const totalFiles = await File.countDocuments();
        console.log('Total files in File collection:', totalFiles);
          if (totalFiles > 0) {
            const files = await File.find({
                fileType: { $in: ['pdf'] }
            }).limit(3);
            files.forEach((file, index) => {
                console.log(`File ${index + 1}:`);
                console.log('  ID:', file._id);
                console.log('  File Type:', file.fileType);
                console.log('  MIME Type:', file.mimeType);
                console.log('  File Name:', file.fileName);
                console.log('  File URL:', file.fileUrl);
                console.log('  Original:', file.original);
                console.log('  ---');
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAttachments();
