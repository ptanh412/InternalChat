const { validationResult } = require('express-validator');
const roleService = require('../services/roleService');

const create = async (req, res) => {
	try {

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {name, permissionData} = req.body;
		const result = await roleService.createRole(name, permissionData);

		return res.status(201).json({
			success: true,
			message: 'Role created successfully',
			data: result
		})
	} catch (error) {
		console.error('Create role error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to create role'
		});
	}
}

const update = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {roleId} = req.params;
		const result = await roleService.updateRole(roleId, req.body);

		return res.status(200).json({
			success: true,
			message: 'Role updated successfully',
			data: result
		})
	} catch (error) {
		console.error('Update role error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update role'
		});
	}
}

const remove = async (req, res) => {
	try {
		const {roleId} = req.params;
		const result = await roleService.deleteRole(roleId);

		return res.status(200).json({
			success: true,
			message: 'Role deleted successfully',
			data: result
		})
	} catch (error) {
		console.error('Delete role error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to delete role'
		});
	}
}

const getAll = async (req, res) =>{
	try{
		const roles = await roleService.getAllRoles();
		return res.status(200).json({
			success: true,
			message: 'Roles fetched successfully',
			data: roles
		})
	}catch	(error){
		console.error('Get roles error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to fetch roles'
		});
	}
}

const getPermissionByScope = async (req, res) =>{
	try{
		const {roleId} = req.params;
		const {scope} = req.query;
		if(!roleId || !scope) {
			return res.status(400).json({
				success: false,
				message: 'Role ID and scope are required'
			});
		};

		const result = await roleService.getRoleWithScopePermissions(roleId, scope);
		return res.status(200).json({
			success: true,
			message: 'Role permissions fetched successfully',
			data: result
		})
	}catch (error){
		console.error('Get role permissions error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to fetch role permissions'
		});
	}
}


module.exports = {
	create,
	update,
	remove,
	getAll,
	getPermissionByScope
}