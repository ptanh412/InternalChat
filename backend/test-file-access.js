const mongoose = require('mongoose');
require('dotenv').config();
const File = require('./models/File');

async function testFileAccess() {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/InternalChat');
        console.log('Connected to MongoDB');
        
        // Get a PDF file to test
        const pdfFile = await File.findOne({ fileType: 'pdf' });
        if (!pdfFile) {
            console.log('No PDF file found');
            process.exit(0);
        }
        
        console.log('Testing file access for:');
        console.log('File ID:', pdfFile._id);
        console.log('File URL:', pdfFile.fileUrl);
        console.log('File Type:', pdfFile.fileType);
        console.log('MIME Type:', pdfFile.mimeType);
        console.log('---');
        
        // Test direct fetch
        try {
            const response = await fetch(pdfFile.fileUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'InternalChat/1.0',
                    'Accept': '*/*'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            
            if (response.ok) {
                console.log('✅ File is accessible via direct URL');
                const contentLength = response.headers.get('content-length');
                console.log('Content length:', contentLength);
            } else {
                console.log('❌ File access failed');
                const responseText = await response.text();
                console.log('Error response:', responseText);
            }
        } catch (error) {
            console.error('❌ Fetch error:', error.message);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testFileAccess();
