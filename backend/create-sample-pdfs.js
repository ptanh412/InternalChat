const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');
const User = require('./models/Users');
const Conversation = require('./models/Conversations');

async function createSamplePDFFiles() {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/internalchat');
        console.log('Connected to MongoDB');
        
        // Check if there are any users first
        const users = await User.find();
        if (users.length === 0) {
            console.log('No users found. Please create users first.');
            process.exit(1);
        }
        
        const conversations = await Conversation.find();
        if (conversations.length === 0) {
            console.log('No conversations found. Please create conversations first.');
            process.exit(1);
        }
        
        // Create sample PDF files
        const samplePDFs = [
            {
                original: 'sample-document.pdf',
                fileName: 'encrypted_sample_document_123.pdf',
                fileUrl: 'https://res.cloudinary.com/demo/raw/upload/sample_pdf.pdf',
                fileType: 'pdf',
                mimeType: 'application/pdf',
                fileSize: 1024576, // 1MB
                uploadedBy: users[0]._id,
                conversationId: conversations[0]._id,
                thumbnails: null
            },
            {
                original: 'report.pdf',
                fileName: 'encrypted_report_456.pdf',
                fileUrl: 'https://res.cloudinary.com/demo/raw/upload/report.pdf',
                fileType: 'pdf',
                mimeType: 'application/pdf',
                fileSize: 2048576, // 2MB
                uploadedBy: users[0]._id,
                conversationId: conversations[0]._id,
                thumbnails: null
            }
        ];
        
        for (const pdfData of samplePDFs) {
            const file = new File(pdfData);
            await file.save();
            console.log('Created PDF file:', file.fileName);
        }
        
        console.log('Sample PDF files created successfully!');
        
        // Verify the PDFs were created
        const pdfFiles = await File.find({ fileType: 'pdf' });
        console.log('Total PDF files now:', pdfFiles.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createSamplePDFFiles();
