const cloudinary = require("cloudinary").v2;
const File = require("../models/File");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const saveFileInfo = async (fileData) => {
    console.log("File data received in save info:", fileData);
    try {
        const file = new File({
            original: fileData.original || fileData.fileName,
            fileName: fileData.fileName,
            fileUrl: fileData.fileUrl,
            fileType: fileData.fileType,
            mimeType: fileData.mimeType,
            fileSize: fileData.fileSize,
            uploadedBy: fileData.uploadedBy,
            conversationId: fileData.conversationId,
            thumbnails: fileData.thumbnails,
        });

        await file.save();
        return file;
    } catch (err) {
        console.error("Error saving file info:", err);
    }
};

const associateFilesWithMessage = async (fileIds, messageId) => {
    try{
        await File.updateMany(
            { _id: { $in: fileIds } },
            {
                $set: {messageId: messageId},
                $addToSet: { usedInMessage: messageId }
            }
        );
    }catch(err){
        console.error("Error associating files with message:", err);
    }
};

const processAttachments = async (attachments, uploadedBy, conversationId) => {
    console.log("Processing attachments:", attachments);
    if (!attachments || attachments.length === 0) {
        return [];
    }
    const fileIds = [];

    for (const attachment of attachments){
        const fileData = {
            ...attachment,
            uploadedBy,
            conversationId,
        }
        const savedFile = await saveFileInfo(fileData);
        fileIds.push(savedFile._id);
    }
    return fileIds;
}

module.exports = {
    saveFileInfo,
    associateFilesWithMessage,
    processAttachments
}
