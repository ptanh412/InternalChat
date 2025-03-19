const permissionService = require('../services/permissionService');

const getAllPermissions = async (req, res) => {
	try {
		const permissions = await permissionService.getAllPermissions();
		res.status(200).json(permissions);
	} catch (error) {
		res.status(500).json({message: error.message});
	}
}
const getPermissionsMatrix = async (req, res) =>{
	try {
		const matrix = await permissionService.getPermissionsMatrix();
		res.status(200).json(matrix);
	} catch (error) {
		res.status(500).json({message: error.message});
	}
}

const updateRolePermissions = async (req, res) =>{
	try {
		const {roleId} = req.params;
		const {permissionKey, value} = req.body;

		console.log(roleId, permissionKey, value);

		if (!roleId || !permissionKey || value === undefined) {
			throw new Error('Missing required fields');
		}

		const updatedPermissions = await permissionService.updateRolePermissions(
			roleId,
			permissionKey,
			value
		)
		res.status(200).json(updatedPermissions);
	}catch (error){
		res.status(500).json({message: error.message});
	}
}

module.exports = {
	getAllPermissions,
	getPermissionsMatrix,
	updateRolePermissions,
}