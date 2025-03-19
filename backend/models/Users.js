const mongoose = require('mongoose');
const Counters = require('./Counters');

const userSchema = new mongoose.Schema({
	employeeId:{
		type: String,
		required: true,
		unique: true
	},
	name:{
		type: String,
		required: true,
		min: 3,
		max: 255
	},
	email:{
		type: String,
		required: true,
		unique: true,
		lowercase: true
	},
	password:{
		type: String,
		required: true,
	},
	department:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Department',
		required: true
	},
	position:{
		type: String,
		required: true,
		enum: ['Director', 'Deputy Director', 'Secretary', 'Department Head', 'Deputy Department', 'Project Leader', 'Administrator', 'Employee']
	},
	role:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Roles',
		required: true
	},
	customPermissions:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Permissions'
	},
	phoneNumber: {
		type: String,
		default: '',
		max: 10
	},
	avatar: {
		type: String,
        default: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1732683090/blank-profile-picture-973460_1280_docdnf.png',
	},
	status: {
		type: String,
		default: 'offline',
		enum: ['online', 'offline']
	},
	lastActive: {
		type: Date,
		default: Date.now
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

userSchema.pre('save', function (next) {
	if (this.isModified('position')  || !this.role){
		const positionToRoleMap = {
			'Administrator': 'admin',
			'Director': 'user',
			'Deputy Director': 'user',
			'Secretary': 'user',
			'Department Head': 'department_head',
			'Deputy Department': 'deputy_head',
			'Project Leader': 'project_leader',
			'Employee': 'user',
		};
		this.role = positionToRoleMap[this.position] || 'user';
	}
	next();
})



module.exports = mongoose.model('User', userSchema);