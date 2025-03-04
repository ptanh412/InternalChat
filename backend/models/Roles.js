const mongoose = require('mongoose');

const rolesSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
        enum: ['admin', 'user', 'department_head', 'deputy_head', 'project_leader', 'deputy_leader']
	},
	permissions:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Permissions',
		required: true
	},
	customPermissions:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Permissions'
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

rolesSchema.index({name: 1});
rolesSchema.index({permissions: 1});

module.exports = mongoose.model('Roles', rolesSchema);