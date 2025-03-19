const Permissions = require('../models/Permissions');
const Roles = require('../models/Roles');
const Users = require('../models/Users');


const createRole = async (name, permissionData) => {
	try {
		const existingRole = await Roles.findOne({
			name
		});
		if (existingRole) throw new Error('Role already exists');

		console.log('permissionData', permissionData);

		const permissions = new Permissions({
			name: `${name}_permissions`,
			...permissionData
		})

		await permissions.save();

		const role = new Roles({
			name,
			permissions: permissions._id
		});

		await role.save();
		return {
			role,
			permissions
		}
	} catch (error) {
		throw error;
	}
};

const updateRole = async (roleId, updateData) => {
	try {
		const role = await Roles.findById(roleId).exec();
		console.log('roleId', roleId);
		console.log('role', role);
		if (!role) throw new Error('Role not found');

		if (updateData.permissions) {
			const permissions = await Permissions.findById(role.permissions);
			if (permissions) {
				Object.keys(updateData.permissions).forEach(key => {
					permissions[key] = updateData.permissions[key];
				});
				permissions.updatedAt = new Date();
				await permissions.save();
			}
			delete updateData.permissions;
		}

		if (updateData.name) {
			if (updateData.name !== role.name) {
				const existingRole = await Roles.findOne({ name: updateData.name });
				if (existingRole) throw new Error('Role already exists');

				const systemRoles = ['admin'];
				if (systemRoles.includes(role.name)) throw new Error('Cannot update system role');

				role.name = updateData.name;
			}
		}

		role.updatedAt = new Date();
		await role.save();
		return role;
	} catch (error) {
		throw error;
	}
}

const deleteRole = async (roleId) => {
	try {
		const role = await Roles.findById(roleId);
		if (!role) throw new Error('Role not found');

		const userCount = await Users.countDocuments({ role: role.name });
		if (userCount > 0) throw new Error('Role has users');

		if (role.permissions) {
			await Permissions.findByIdAndDelete(role.permissions);
		}

		if (role.customPermissions) {
			await Permissions.findByIdAndDelete(role.customPermissions);
		}

		await Roles.findByIdAndDelete(roleId);
		return true;
	} catch (error) {
		throw error;
	}
}

const getAllRoles = async () => {
    try {
        const roles = await Roles.find()
            .populate('permissions', 'name createGroup createDepartment manageDepartment manageUsers')
            .populate('customPermissions')

        return roles;
    } catch (error) {
        throw error;
    }
}

const getRoleWithScopePermissions = async (roleId, scope) => {
	try {
		const role = await Roles.findById(roleId)
			.populate('permissions')
			.populate('customPermissions');

		if (!role) throw new Error('Role not found');

		let scopePermissions = {};

		if (role.customPermissions && role.customPermissions.scope === scope) {
			scopePermissions = role.customPermissions;
		} else {
			scopePermissions = role.permissions;
		}

		return {
			role,
			scopePermissions
		}
	} catch (error) {
		throw error;
	}
}

module.exports = {
	createRole,
	updateRole,
	deleteRole,
	getAllRoles,
	getRoleWithScopePermissions
}