const Users = require('../models/Users');


const authorizeAdmin = async (req, res, next) => {
	try{
		if (!req.user){
			return res.status(401).json({
				success: false,
				message: 'Unauthorized'
			});
		}

		const user = await Users.findById(req.user.id)
		.populate({
			path: 'role',
			populate:{
				path: 'permissions customPermissions',
				model: 'Permissions'
			}
		});

		if (!user){
			return res.status(404).json({
				success: false,
				message: 'User not found'
			})
		};

		if (user.role.name === 'admin'){
			next();
		}

		let userPermissions = null;

		if (user.role.permissions && user.role.permissions.manageUsers === true){
			userPermissions = user.role.permissions;
		}else if (user.role.customPermissions && user.role.customPermissions.manageUsers === true){
			userPermissions = user.role.customPermissions;
		}

		if (userPermissions && userPermissions.manageUsers === true){
			next();
		}
		return res.status(403).json({
			success: false,
			message: 'Forbidden'
		});
	}catch{
		console.error('Authorize admin error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Internal server error'
		});
	}
}

module.exports = authorizeAdmin;