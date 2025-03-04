const Permission = require('../models/Permissions');
const Roles = require('../models/Roles');
const helpers = require('../helper/permission');

const getAllPermissions = async () =>{
	try{
		const permissions = await Permission.find({});

		const groupedPermissions = {
			system: permissions.filter(p => p.scope === 'system'),
			conversation_department: permissions.filter(p => p.scope === 'conversation_department'),
			conversation_group: permissions.filter(p => p.scope === 'conversation_group'),
			conversation_private: permissions.filter(p => p.scope === 'conversation_private'),
		}

		return groupedPermissions;
	}catch	(error){
		throw new Error(`Failed to fetch permission: ${error.message}`);
	}
}

const getPermissionsMatrix = async () =>{
	try{
		const roles = await Roles.find().populate('permissions');
		const systemPermissions = await Permission.find({scope: 'system'});
		const conversationDeptPermissions = await Permission.find({scope: 'conversation_department'});

		const systemMatrix = {
			permissions: ['createGroup', 'createDepartment', 'manageDepartment', 'manageUsers'],
			roles: roles.map(role => ({
				id: role._id,
				name: role.name,
				values:{
					createGroup: role.permissions.createGroup || false,
					createDepartment: role.permissions.createDepartment || false,
					manageDepartment: role.permissions.manageDepartment || false,
					manageUsers: role.permissions.manageUsers || false,
				}
			}))
		}

		const conversationMatrix = {
			permissions: ['assignDeputies', 'canChat', 'canAddMembers', 'canRemoveMembers', 'canEditConversation'],
			roles: roles.map(role => ({
				id: role._id,
				name: role.name,
				values:{
					assignDeputies: role.permissions.assignDeputies || false,
					canChat: role.permissions.canChat || false,
					canAddMembers: role.permissions.canAddMembers || false,
					canRemoveMembers: role.permissions.canRemoveMembers || false,
					canEditConversation: role.permissions.canEditConversation || false,
				}
			}))
		}

		return {
			systemMatrix,
			conversationMatrix
		}
	}catch	(error){
		throw new Error(`Failed to fetch permission matrix: ${error.message}`);
	}
}

const updateRolePermissions = async (roleId, permissionUpdates, scope, adminUser = null) =>{
	try{
		const role = await Roles.findById(roleId).populate('permissions');

		if(!role){
			throw new Error('Role not found');
		}

		let permissionDoc = await Permission.findById(role.permissions._id);

		const originalPermissions = permissionDoc ? {...permissionDoc.toObject()} : {};

		if (!permissionDoc || permissionDoc.scope !== scope) {
			permissionDoc = new Permission({
				name: `${role.name}_${scope}_permissions`,
				scope: scope,
			});
			await permissionDoc.save();

			role.customPermissions = permissionDoc._id;
			await role.save();
		}

		Object.keys(permissionUpdates).forEach(key =>{
			if (key in permissionDoc) {
				permissionDoc[key] = permissionUpdates[key];
			}
		});

		permissionDoc.updatedAt = Date.now();
		await permissionDoc.save();

		await helpers.notifyUserPermissionChanges(role, originalPermissions, permissionUpdates, scope, adminUser);

		return permissionDoc;
	}catch (error){
		throw new Error(`Failed to update role permissions: ${error.message}`);
	}
}

const initialPermissions = async () =>{
	try {
		let systemPermissions = await Permission.find({scope: 'system'});
		if (!systemPermissions){
			systemPermissions = new Permission({
				name: 'system_default',
				scope: 'system',
				createGroup: false,
				createDepartment: false,
				manageDepartment: false,
				manageUsers: false,
			});
			await systemPermissions.save();
		}

		let conversationDeptPermissions = await Permission.find({scope: 'conversation_department'});
		if (!conversationDeptPermissions){
			conversationDeptPermissions = new Permission({
				name: 'conversation_department_default',
				scope: 'conversation_department',
				assignDeputies: false,
				canChat: true,
				canAddMembers: false,
				canRemoveMembers: false,
				canEditConversation: false,
			});
			await conversationDeptPermissions.save();
		}

		const adminRole = await Roles.findOne({name: 'admin'});
		if (adminRole){
			const adminPermissions = new Permission({
				name: 'admin_permissions',
				scope: 'system',
				createGroup: true,
				createDepartment: true,
				manageDepartment: true,
				manageUsers: true,
				assignDeputies: true,
				canChat: true,
				canAddMembers: true,
				canRemoveMembers: true,
				canEditConversation: true,
			});
			await adminPermissions.save();

			adminRole.permissions = adminPermissions._id;
			await adminRole.save();
		}

		return {
			systemPermissions,
			conversationDeptPermissions,
		}
	} catch (error) {
		throw new Error(`Failed to initialize permissions: ${error.message}`);
	}
}

module.exports = {
	getAllPermissions,
	getPermissionsMatrix,
	updateRolePermissions,
	initialPermissions,
}