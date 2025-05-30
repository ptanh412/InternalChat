require('dotenv').config();
const encryption = require('./utils/encryptionMsg.js');

console.log('Testing encryption functionality...');

const testMessage = 'Hello World! This is a test message 🚀';
const testConvId = '507f1f77bcf86cd799439011';

try {
    console.log('Original message:', testMessage);
    
    // Test encryption
    const encrypted = encryption.encryptMessage(testMessage, testConvId);
    console.log('Encrypted message:', encrypted);
    
    // Test decryption
    const decrypted = encryption.decryptMessage(encrypted, testConvId);
    console.log('Decrypted message:', decrypted);
    
    // Verify
    const isCorrect = testMessage === decrypted;
    console.log('✅ Test passed:', isCorrect);
    
    if (!isCorrect) {
        console.error('❌ Encryption/Decryption failed!');
        process.exit(1);
    }
    
    // Test with different conversation ID (should fail to decrypt correctly)
    const differentConvId = '507f1f77bcf86cd799439012';
    try {
        const decryptedWithDifferentKey = encryption.decryptMessage(encrypted, differentConvId);
        console.log('Decryption with different key should fail or return garbled text');
    } catch (error) {
        console.log('✅ Correctly failed to decrypt with different conversation ID');
    }
    
    console.log('🎉 All encryption tests passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
