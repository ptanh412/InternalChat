const authService = require('../services/authService');
const {validationResult} = require('express-validator');

const createUser = async (req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}

		// const {userData} = req.body;

		const result = await authService.createUser(req.body);

		return res.status(201).json({
			success: true,
			message: 'Create userr successfully',
			data: result
		});

	} catch (error) {
		console.error('Registration error: ', error.message);
		if (error.code === 11000){
			return res.status(400).json({
				success: false,
				message: 'Employee ID or email already exists'
			});
		}
		return res.status(500).json({
			success: false,
			message: error.message || 'Registration failed'
		});
	}
}

const updateUser = async (req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}

		const {userId} = req.params;
		const updateData = req.body;

		const result = await authService.updateUser(userId, updateData, req.user);
		return res.status(200).json({
			success: true,
			message: 'User updated successfully',
			data: result
		})
	} catch (error) {
		console.error('Update user error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update user'
		});
	}
}

const login = async (req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}

		const {email, password} = req.body;

		const result = await authService.login({email, password});

		return res.status(200).json({
			success: true,
			message: 'User logged in successfully',
			data: result
		});
	} catch (error) {
		console.error('Login error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Login failed'
		});
	}
}

const changePassword = async (req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}

		const {currentPassword, newPassword} = req.body;
		const userId = req.user.id;

		await authService.changePassword(userId, currentPassword, newPassword);

		return res.status(200).json({
			success: true,
			message: 'Password changed successfully'
		});
	} catch (error) {
		console.error('Change password error: ', error.message);
		return res.status(400).json({
			success: false,
			message: error.message || 'Failed to change password'
		})
	}
}

const resetPassword = async(req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}

		const {email} = req.body;

		await authService.resetPassword(email);

		return res.status(200).json({
			success: true,
			message: 'Password reset successful. A new password has been sent to your email'
		})
	} catch (error) {
		console.error('Reset password error: ', error.message);
		if (error.message === 'User not found'){
			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to reset password'
		});
	}
}

const getUsers = async (req, res) =>{
	try{
		const {page =1, limit =10, department, position, status, search} = req.query;

		const result = await authService.getAllUsers(
			{department, position, status, search},
			parseInt(page),
			parseInt(limit)
		);
		return res.status(200).json({
			success: true,
			data: result.users,
			pagination: result.pagination
		})
	}catch(error){
		console.error('Get users error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to get users'
		});
	}
}

module.exports = {
	createUser,
	login,
	changePassword,
	updateUser,
	resetPassword,
	getUsers
};