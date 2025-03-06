const permissionService = require('../services/permissionService');

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
		const {permissionUpdates, scope} = req.body;

		if (!roleId || !permissionUpdates || !scope) {
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
	getPermissionsMatrix,
	updateRolePermissions,
}