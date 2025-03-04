const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
	name:{
		type: String,
		required: true,
		unique: true
	},
	description:{
		type: String,
		required: true
	},
	header:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	members: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}],
	conversationId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Conversation'
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

departmentSchema.index({header: 1});
departmentSchema.index({members: 1});

module.exports = mongoose.model('Department', departmentSchema);