const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fileService = require('../services/fileService');
const authMiddleware = require('../middlewares/authentication');
const File = require('../models/File');
const User = require('../models/Users');
const { Readable } = require('stream');
const contentDisposition = require('content-disposition');
const encryptionService = require('../utils/encryptionMsg');
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let resourceType = 'auto';
        const docTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
        ];

        if (docTypes.includes(file.mimetype) || file.mimetype.startsWith('application/')) {
            resourceType = 'raw';
        }

        return {
            folder: 'InternalChat',
            resource_type: resourceType,
            public_id: `${Date.now()}_${file.originalname}`,
        };
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

router.get('/media/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Fetch file from Cloudinary with proper error handling
        const response = await fetch(file.fileUrl);
        if (!response.ok) {
            console.error(`Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`);
            return res.status(500).json({ message: 'Error fetching file from storage' });
        }

        // Set proper Content-Type header
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        
        // Decrypt the filename before setting Content-Disposition header
        let fileName = file.fileName;
        if (file.conversationId) {
            try {
                fileName = encryptionService.decryptFileName(file.fileName, file.conversationId.toString());
            } catch (error) {
                console.error('Error decrypting filename:', error);
                // Fallback to original filename if decryption fails
                fileName = file.original || file.fileName;
            }
        }
        
        // For non-image files, force download with proper filename
        if (['document', 'spreadsheet', 'presentation', 'archive', 'pdf'].includes(file.fileType)) {
            res.setHeader(
                'Content-Disposition',
                contentDisposition(fileName, { type: 'attachment' })
            );
        }

        // Handle different Node.js versions for streaming
        try {
            if (typeof Readable.fromWeb === 'function') {
                // Node.js 16.5+ with Web Streams support
                Readable.fromWeb(response.body).pipe(res);
            } else {
                // Fallback for older Node.js versions
                const buffer = await response.arrayBuffer();
                res.send(Buffer.from(buffer));
            }
        } catch (streamError) {
            console.error('Error streaming file:', streamError);
            // Final fallback - send as buffer
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        }    } catch (err) {
        // console.error("Error fetching media:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/download/:fileId', authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Fetch file from Cloudinary with proper error handling
        const response = await fetch(file.fileUrl);
        if (!response.ok) {
            console.error(`Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`);
            return res.status(500).json({ message: 'Error fetching file from storage' });
        }

        // Set proper Content-Type header
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        
        // Decrypt the filename before setting Content-Disposition header
        let fileName = file.fileName;
        if (file.conversationId) {
            try {
                fileName = encryptionService.decryptFileName(file.fileName, file.conversationId.toString());
            } catch (error) {
                console.error('Error decrypting filename:', error);
                // Fallback to original filename if decryption fails
                fileName = file.original || file.fileName;
            }
        }
        
        // Force download with proper filename for all file types
        res.setHeader(
            'Content-Disposition',
            contentDisposition(fileName, { type: 'attachment' })
        );

        // Handle different Node.js versions for streaming
        try {
            if (typeof Readable.fromWeb === 'function') {
                // Node.js 16.5+ with Web Streams support
                Readable.fromWeb(response.body).pipe(res);
            } else {
                // Fallback for older Node.js versions
                const buffer = await response.arrayBuffer();
                res.send(Buffer.from(buffer));
            }
        } catch (streamError) {
            console.error('Error streaming file:', streamError);
            // Final fallback - send as buffer
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        }
    } catch (err) {
        console.error("Error downloading file:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/media/thumbnail/:fileId', authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const file = await File.findById(fileId);

        if (!file || !file.thumbnails) {
            return res.status(404).json({ message: 'File not found' });
        }

        const response = await fetch(file.thumbnails);
        if (!response.ok) {
            return res.status(500).json({ message: 'Error fetching thumbnail' });
        }

        res.setHeader('Content-Type', 'image/jpeg');

        response.body.pipe(res);
    } catch (err) {
        console.error("Error fetching thumbnail:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
})

router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        };

        const userId = req.user._id;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                avatar: req.file.path,
                updatedAt: Date.now()
            },
            { new: true, select: '-password' }
        );
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.emit('user:avatar-update', {
                userId: userId.toString(),
                updateFields: { avatar: req.file.path },
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            user: updatedUser
        })
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
})

router.post('/upload', authMiddleware, upload.array('files', 10), async (req, res) => {
    try {
        const files = req.files;
        const { conversationId } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const fileInfo = [];
        let fileType = null;

        for (const file of files) {
            console.log("File data:", file);
            if (file.mimetype.startsWith('image/')) fileType = 'image';
            else if (file.mimetype.startsWith('video/')) fileType = 'video';
            else if (file.mimetype === 'application/pdf') fileType = 'pdf';
            // Specific checks for document types
            else if (file.mimetype === 'application/msword' ||
                file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.mimetype.startsWith('document/')) fileType = 'document';
            // Specific checks for spreadsheet types
            else if (file.mimetype === 'application/vnd.ms-excel' ||
                file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) fileType = 'spreadsheet';
            // Specific checks for presentation types
            else if (file.mimetype === 'application/vnd.ms-powerpoint' ||
                file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                file.mimetype.includes('presentation') || file.mimetype.includes('powerpoint')) fileType = 'presentation';
            else if (file.mimetype.includes('zip') || file.mimetype.includes('rar') || file.mimetype.includes('7z')) fileType = 'archive';
            const fileData = {
                original: file.originalname,
                fileName: file.filename,
                fileUrl: file.path,
                fileType: fileType,
                mimeType: file.mimetype,
                fileSize: file.size,
                uploadedBy: req.user._id,
                conversationId: conversationId,
                thumbnails: file.path && fileType === 'image' ? file.path.replace('/upload', '/upload/w_200,h_200,c_fill') : null,
            };

            console.log("File data to save:", fileData);
            const url = process.env.SERVER_URL

            const savedFile = await fileService.saveFileInfo(fileData);
            fileInfo.push({
                _id: savedFile._id,
                fileName: savedFile.fileName,
                fileUrl: savedFile.fileUrl,
                fileType: savedFile.fileType,
                mimeType: savedFile.mimeType,
                fileSize: savedFile.fileSize,
                uploadedBy: savedFile.uploadedBy,
                conversationId: savedFile.conversationId,
                thumbnails: savedFile.thumbnails
            })
        }
        res.status(200).json({
            message: 'Files uploaded successfully',
            files: fileInfo,
        });
    } catch (err) {
        console.error("Error in file upload:", err.message, err.stack, err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/conversation/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const files = await File.find({ conversationId: conversationId }).sort({ uploadedAt: -1 }).limit(10);

        res.status(200).json({
            message: 'Files fetched successfully',
            files: files,
        });
    } catch (err) {
        console.error("Error fetching files:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;