const mongoose = require('mongoose');
const Department = require('./models/Department');
const User = require('./models/Users');
const Role = require('./models/Roles');
const Permission = require('./models/Permissions');
const bcrypt = require('bcrypt');
const Counters = require('./models/Counters');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/InternalChat', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected.');

    // await Promise.all([
    //   // Department.deleteMany({}),
    //   // User.deleteMany({}),
    //   // Role.deleteMany({}),
    //   Permission.deleteMany({})
    // ])

    // console.log('Database cleared!');

    // const department = new Department({
    //   name: 'IT Department',
    //   description: 'Information Technology Department',
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // });
    // await department.save();
    // console.log('Department created!', department);

    const adminPermissions = new Permission({
      name: 'admin_permissions',
      createGroup: true,
      createDepartment: true,
      manageDepartment: true,
      manageUsers: true,
      // assignDeputies: true,
      // canChat: true,
      // canAddMembers: true,
      // canRemoveMembers: true,
      // canEditConversation: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminPermissions.save();

    console.log('Permissions admin created!', adminPermissions);

    const adminRole = await Role.findOneAndUpdate(
      { name: 'admin' },
      {
        $set: {
          permissions: adminPermissions._id,
          updatedAt: new Date()
        }
      },
      {new: true}
    );

    await adminRole.save();

    console.log('Role admin created!', adminRole);

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash('Admin123@', salt);

    // const admin = new User({
    //   employeeId: 'IC001',
    //   name: 'Admin',
    //   email: '1050080043@sv.hcmunre.edu.vn',
    //   password: hashedPassword,
    //   role: adminRole._id,
    //   department: department._id,
    //   position: 'Administrator',
    //   phoneNumber: '0123456789',
    //   avatar: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1732683090/blank-profile-picture-973460_1280_docdnf.png',
    //   status: 'offline',
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // });
    // await Counters.create({ name: 'employeeId', sequenceValue: 1 });

    // await department.updateOne({ $push: { users: admin._id } });

    // await admin.save();

    // console.log('Admin created!', admin);

    console.log('\n Seed data inserted successfully!');
    process.exit();
  } catch (error) {
    console.error('Error inserting department:', error);
    process.exit(1);
  }
};

connectDB();
