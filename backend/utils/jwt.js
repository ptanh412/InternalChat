const jwt = require('jsonwebtoken');
require('dotenv').config();
const secret = process.env.JWT_SECRET_KEY;

const generateToken = (payload) => {
	return jwt.sign(payload, secret, { expiresIn: '1d' });
};

const verifyToken = (token) => {
	try {
		return jwt.verify(token, secret);
	} catch (error) {
		throw new Error('Session expired');
	}
}

const decodeToken = (token) => {
	return jwt.decode(token);
};

module.exports = { generateToken, verifyToken, decodeToken };