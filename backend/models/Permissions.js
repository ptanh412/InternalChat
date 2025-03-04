const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	scope:{
		type: String,
		enum: ['system', 'conversation_group', 'conversation_department', 'conversation_private'],
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
	assignDeputies:{
		type: Boolean,
		default: false
	},
	canChat:{
		type: Boolean,
		default: false
	},
	canAddMembers:{
		type: Boolean,
		default: false
	},
	canRemoveMembers:{
		type: Boolean,
		default: false
	},
	canEditConversation:{
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