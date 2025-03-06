const Permission = require('../models/Permissions');
const Roles = require('../models/Roles');
const helpers = require('../helper/permission');

const getAllPermissions = async () =>{
	try{
		const permissions = await Permission.find({});
		return permissions;
	}catch	(error){
		throw new Error(`Failed to fetch permission: ${error.message}`);
	}
}

const getPermissionsMatrix = async () =>{
	try{
		const roles = await Roles.find().populate('permissions');

		const permissionKeys = [
			'createGroup',
			'createDepartment',
			'manageDepartment',
			'mangeUsers',
		]

		const permissionsMatrix = {
			permissions: permissionKeys,
			roles: roles.map(role =>{
				const permissionObj = role.permissions || {};

				return {
					id: role._id,
					name: role.name,
					values: permissionKeys.reduce((acc, key) =>{
						acc[key] = permissionObj[key] || false;
						return acc;
					}, {})
				}
			})
		}

		return permissionsMatrix;
	}catch	(error){
		throw new Error(`Failed to fetch permission matrix: ${error.message}`);
	}
}

const updateRolePermissions = async (roleId, permissionKey, value) =>{
	try{
		const role = await Roles.findById(roleId).populate('permissions');

		if(!role){
			throw new Error('Role not found');
		}

		let permissionDoc = role.permissions;

		if (!permissionDoc){
			permissionDoc = new Permission({
				name: `${role.name} permissions`
			});
			await permissionDoc.save();

			role.permissions = permissionDoc._id;
			await role.save();
		}

		if (permissionKey in permissionDoc){
			permissionDoc[permissionKey] = value;
			permissionDoc.updatedAt = new Date();
			await permissionDoc.save();

			return{
				roleId,
				roleName: role.name,
				permissionKey,
				value,
				success: true
			}
		}else {
			throw new Error('Invalid permission key');
		}
	}catch (error){
		throw new Error(`Failed to update role permissions: ${error.message}`);
	}
}

module.exports = {
	getAllPermissions,
	getPermissionsMatrix,
	updateRolePermissions,
}