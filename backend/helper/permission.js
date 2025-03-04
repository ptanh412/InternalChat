const Roles = require("../models/Roles");
const Permission = require('../models/Permissions');
const Users = require("../models/Users");
const Notifications = require("../models/Notifications");
const Permissions = require("../models/Permissions");

const notifyUserPermissionChanges = async (role, originalPermissions, updatedPermissions, scope, adminUser)=>{

	const users = await Users.find({role: role._id});

	if (users.length === 0){
		return;
	}

	let changeMessage = `Your permissions have been updated by ${adminUser.name}.\n\n`;

	let changes = [];

	Object.keys(updatedPermissions).forEach(key =>{
		if (originalPermissions[key] !== updatedPermissions[key]){
			const action = updatedPermissions[key] ? 'granted' : 'removed';

			const readableKey = key
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, (str) => str.toUpperCase());

			changes.push(`${readableKey} has been ${action}`);
		}
	});

	if (changes.length === 0){
		return;
	}

	changeMessage += '' + changes.join(',');

	const notifications = users.map(user =>({
		sender: adminUser ? adminUser._id : null,
		received: user._id,
		content: changeMessage,
		type: 'message'
	}));

	await Notifications.insertMany(notifications);
}

const getEffectivePermissions = async (user, conversation) =>{
	try{
		const userRole = await Roles.findById(user.role).populate('permissions');

		const rolePermissions = userRole?.permissions || {};

		const conversationPermissions = await Permissions.findById(conversation.permissionSettings);

		const isAdmin = conversation.admins.some(admin => admin.toString() === user._id.toString());
		const isDeputyAdmin = conversation.deputyadmins.some(deputy => deputy.toString() === user._id.toString());

		const effectivePermissions = {
			canChat: isAdmin || isDeputyAdmin || (conversationPermissions?.canChat || false),
			canAddMembers: isAdmin || ( isDeputyAdmin && conversationPermissions?.canAddMembers || false) || (conversationPermissions?.canAddMembers || false),
			canRemoveMembers: isAdmin || (isDeputyAdmin && conversationPermissions?.canRemoveMembers || false) || (conversationPermissions?.canRemoveMembers || false),
			canEditConversation: isAdmin || (isDeputyAdmin && conversationPermissions?.canEditConversation || false) || (conversationPermissions?.canEditConversation || false),
			assignDeputies: isAdmin || (rolePermissions?.assignDeputies || false)
		}
		return effectivePermissions;
	}catch(error){
		throw new Error(`Failed to get effective permissions: ${error.message}`);
	}
}
module.exports = {
	notifyUserPermissionChanges,
	getEffectivePermissions
}