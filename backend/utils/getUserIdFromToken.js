const {verifyToken} = require('./jwt');
const getUserIdFromToken = (token) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) {
		throw new Error('Token not found');
	};

	const decode = verifyToken(token);
	return decode.userId;
};

module.exports = getUserIdFromToken;