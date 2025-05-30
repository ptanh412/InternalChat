const crypto = require('crypto');

class EncryptionMsg {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
    }

    generateConvKey(conversationId, masterSecret = process.env.ENCRYPTION_MASTER_KEY) {
        if (!masterSecret) {
            throw new Error('ENCRYPTION_MASTER_KEY not found')
        }

        return crypto.pbkdf2Sync(
            conversationId.toString(),
            masterSecret,
            100000,
            this.keyLength,
            'sha256'
        )
    }    encryptMessage(content, conversationId) {
        try {
            const key = this.generateConvKey(conversationId);
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);

            let encrypted = cipher.update(content, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const tag = cipher.getAuthTag();

            return iv.toString('hex') + tag.toString('hex') + encrypted;
        } catch (e) {
            console.error('Encryption error:', e);
            throw new Error('Failed to encrypt message')
        }
    }    decryptMessage(encryptContent, conversationId) {
        try {
            if (!encryptContent) return '';

            // Check if content is encrypted by validating expected length and hex format
            const expectedMinLength = (this.ivLength + this.tagLength) * 2; // IV + tag in hex
            if (encryptContent.length < expectedMinLength) {
                // Content is too short to be encrypted, return as-is
                return encryptContent;
            }

            // Check if the content looks like encrypted data (hex format)
            const hexPattern = /^[0-9a-fA-F]+$/;
            if (!hexPattern.test(encryptContent)) {
                // Content doesn't look like hex-encoded encrypted data, return as-is
                return encryptContent;
            }

            const key = this.generateConvKey(conversationId);

            const ivHex = encryptContent.substring(0, this.ivLength * 2)
            const tagHex = encryptContent.substring(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
            const encryptedHex = encryptContent.substring((this.ivLength + this.tagLength) * 2);

            // Validate hex strings before creating buffers
            if (ivHex.length !== this.ivLength * 2 || tagHex.length !== this.tagLength * 2) {
                // Invalid format, return original content
                return encryptContent;
            }

            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (e) {
            console.error('Decryption error:', e);
            // Return original content if decryption fails (likely unencrypted content)
            return encryptContent;
        }
    }encryptMessages(messages, conversationId) {
        return messages.map(message => ({
            ...message,
            content: message.content ? this.encryptMessage(message.content, conversationId) : message.content
        }));
    }

    decryptMessages(messages, conversationId) {
        return messages.map(message => ({
            ...message,
            content: message.content ? this.decryptMessage(message.content, conversationId) : message.content
        }));
    }

    encryptFileName(fileName, conversationId) {
        if (!fileName) return fileName;

        try {
            const lastDotIndex = fileName.lastIndexOf('.');
            const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
            const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

            const encryptedName = this.encryptMessage(name, conversationId);
            return encryptedName + extension;
        } catch (e) {
            console.error('File name encryption error:', e);
            return fileName;
        }
    }
    // Giải mã file name
    decryptFileName(encryptedFileName, conversationId) {
        if (!encryptedFileName) return encryptedFileName;

        try {
            const lastDotIndex = encryptedFileName.lastIndexOf('.');
            const encryptedName = lastDotIndex > 0 ?
                encryptedFileName.substring(0, lastDotIndex) : encryptedFileName;
            const extension = lastDotIndex > 0 ? encryptedFileName.substring(lastDotIndex) : '';

            const decryptedName = this.decryptMessage(encryptedName, conversationId);
            return decryptedName + extension;
        } catch (error) {
            console.error('File name decryption error:', error);
            return encryptedFileName;
        }
    }
}

module.exports = new EncryptionMsg();