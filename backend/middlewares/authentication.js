const {verifyToken} = require('../utils/jwt');
const Users = require('../models/Users');

const authentication = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];

		if (!token) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized'
			});
		}

		const decode = verifyToken(token);
		const user = await Users.findById(decode.id);

		if (!user){
			return res.status(401).json({
				success: false,
				message: 'Unauthorized'
			});
		}

		req.user = user;
		next();
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message || 'Internal server error'
		});
	}
}

module.exports = authentication;