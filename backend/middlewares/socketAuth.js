const { verifyToken } = require('../utils/jwt');

const Users = require('../models/Users');

const socketAuth = async (socket, next) => {
	try {
		const token = socket.handshake.auth?.token ||
			socket.handshake.query?.token;
		if (!token) {
			throw new Error('Authentication failed');
		}

		const decoded = verifyToken(token);

		const user = await Users.findById(decoded.id);

		if (!user) {
			throw new Error('Authentication failed');
		};

		socket.user = user;
		next();
	} catch (error) {
		console.log(error);
		next(new Error('Authentication failed'));
	}
};

module.exports = socketAuth;