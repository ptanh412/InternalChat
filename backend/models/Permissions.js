const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	createGroup:{	
		type: Boolean,
		default: false
	},
	createDepartment:{
		type: Boolean,
		default: false
	},
	manageDepartment:{
		type: Boolean,
		default: false
	},
	manageUsers:{
		type: Boolean,
		default: false
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
})

module.exports = mongoose.model('Permissions', permissionsSchema);