const Users = require('../models/Users');


const authorizeAdmin = async (req, res, next) => {
    try {
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
            });
        }

        // Simplify permission check
        const isAdmin = user.role.name === 'admin';
        const hasManageUsersPermission = 
            (user.role.permissions?.manageUsers) || 
            (user.role.customPermissions?.manageUsers);

        if (isAdmin || hasManageUsersPermission) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Forbidden'
        });

    } catch (error) {
        console.error('Authorize admin error: ', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

module.exports = authorizeAdmin;