// encryptionService.js (Frontend)
class ClientEncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    // Tạo key từ conversationId (phải khớp với backend)
    async generateConversationKey(conversationId, masterSecret = '502c523907a225a182418727e84151ac59e10d0ce529a4849f05039095a0fdc4') {
        const encoder = new TextEncoder();
        const data = encoder.encode(conversationId.toString());
        const key = encoder.encode(masterSecret);
        
        // Import key để sử dụng với PBKDF2
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            key,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        // Derive key từ conversationId
        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: data,
                iterations: 100000,
                hash: 'SHA-256'
            },
            cryptoKey,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Mã hóa tin nhắn (client-side)
    async encryptMessage(content, conversationId) {
        try {
            if (!content) return content;
            
            const key = await this.generateConversationKey(conversationId);
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );
            
            // Kết hợp iv + encrypted data
            const encryptedArray = new Uint8Array(encrypted);
            const result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv);
            result.set(encryptedArray, iv.length);
            
            // Convert to hex
            return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Client encryption error:', error);
            return content; // Fallback to original content
        }
    }    // Giải mã tin nhắn (client-side)
    async decryptMessage(encryptedContent, conversationId) {
        try {
            if (!encryptedContent) return encryptedContent;
            
            // Kiểm tra xem có phải là hex string không
            if (!/^[0-9a-fA-F]+$/.test(encryptedContent)) {
                // console.log('Content is not hex encoded, returning as-is');
                return encryptedContent; // Không phải hex, trả về nguyên bản
            }
            
            // Check if hex string has valid length (should be even)
            if (encryptedContent.length % 2 !== 0) {
                // console.log('Invalid hex string length, returning as-is');
                return encryptedContent;
            }
            
            const key = await this.generateConversationKey(conversationId);
            
            // Convert hex to bytes
            const encryptedData = new Uint8Array(
                encryptedContent.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            
            // console.log('Encrypted data length:', encryptedData.length);
            
            if (encryptedData.length < 12) {
                console.log('Encrypted data too short, returning as-is');
                return encryptedContent;
            }
            
            const iv = encryptedData.slice(0, 12); // First 12 bytes are IV
            const ciphertext = encryptedData.slice(12); // Rest is ciphertext
            
            // console.log('IV length:', iv.length, 'Ciphertext length:', ciphertext.length);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            const result = decoder.decode(decrypted);
            console.log('Decryption successful:', result);
            return result;
        } catch (error) {
            console.error('Client decryption error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                encryptedContent: encryptedContent,
                conversationId: conversationId
            });
            return encryptedContent; // Fallback to encrypted content
        }
    }

    // Giải mã danh sách tin nhắn
    async decryptMessages(messages, conversationId) {
        const decryptedMessages = [];
        for (const message of messages) {
            const decryptedMessage = {
                ...message,
                content: await this.decryptMessage(message.content, conversationId)
            };
            
            // Giải mã tên file nếu có attachments
            if (message.attachments && message.attachments.length > 0) {
                decryptedMessage.attachments = await Promise.all(
                    message.attachments.map(async (attachment) => ({
                        ...attachment,
                        fileName: await this.decryptMessage(attachment.fileName, conversationId)
                    }))
                );
            }
            
            decryptedMessages.push(decryptedMessage);
        }
        return decryptedMessages;
    }
}

// Export instance
const clientEncryptionService = new ClientEncryptionService();
export default clientEncryptionService;