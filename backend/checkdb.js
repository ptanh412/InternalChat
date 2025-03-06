const mongoose = require('mongoose');
const Users = require('./models/Users'); // Adjust path as needed
const bcrypt = require('bcrypt');

const fullUserDebug = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/InternalChat', { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });

        console.log('🔍 Detailed User Debugging Started');

        // Attempt to find user by email with various methods
        console.log('\n1. Exact Email Search:');
        const exactUser = await Users.findOne({ 
            email: '1050080043@sv.hcmunre.edu.vn' 
        });
        console.log('Exact Email Match:', exactUser);

        console.log('\n2. Case-Insensitive Regex Search:');
        const regexUser = await Users.findOne({ 
            email: { $regex: new RegExp('^1050080043@sv.hcmunre.edu.vn$', 'i') } 
        });
        console.log('Regex Email Match:', regexUser);

        console.log('\n3. Partial Database Exploration:');
        const allUsers = await Users.find({});
        console.log('Total Users Count:', allUsers.length);
        console.log('All Users Emails:', allUsers.map(u => u.email));

        console.log('\n4. Detailed User Inspection:');
        if (allUsers.length > 0) {
            allUsers.forEach((user, index) => {
                console.log(`User ${index + 1}:`, {
                    email: user.email,
                    passwordLength: user.password ? user.password.length : 'No password',
                    employeeId: user.employeeId
                });
            });
        }

        // Verify password matching
        if (allUsers.length > 0) {
            console.log('\n5. Password Verification Test:');
            const testPassword = 'Admin123@';
            const firstUser = allUsers[0];
            
            console.log('First User Email:', firstUser.email);
            console.log('First User Hashed Password:', firstUser.password);
            
            const passwordMatch = await bcrypt.compare(testPassword, firstUser.password);
            console.log('Password Match Result:', passwordMatch);
        }

    } catch (error) {
        console.error('🚨 Debugging Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

fullUserDebug();