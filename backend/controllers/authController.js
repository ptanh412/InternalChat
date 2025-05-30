const authService = require('../services/authService');
const {validationResult} = require('express-validator');
const socketService = require('../services/socketService');

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

const forgotPassword = async (req, res) =>{
	try {
		const errors = validationResult(req);
		if(!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}
		const {email} = req.body;

		await authService.forgotPassword(email);

		return res.status(200).json({
			success: true,
			message: 'Password reset link sent to your email'
		})
	} catch (error) {
		console.error('Forgot password error: ', error.message);
		if (error.message === 'User not found'){
			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to send password reset link'
		});
	}
}

const resetPassword = async(req, res) =>{
	try {
		const {token, newPassword} = req.body;

		await authService.resetPassword(token,newPassword);

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
			data: result
		})
	}catch(error){
		console.error('Get users error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to get users'
		});
	}
}

const getUserId = async (req, res) =>{
	try {
		const {userId} = req.params;
		const result = await authService.getUserById(userId);
		return res.status(200).json({
			success: true,
			data: result
		})
	} catch (error) {
		console.error('Get user by id error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to get user'
		});
	}
}

const deleteUser = async (req, res) =>{
	try {
		const {userId} = req.params;
		const result = await authService.deleteUser(userId);
		return res.status(200).json({
			success: true,
			message: 'User deleted successfully',
			data: result
		})
	} catch (error) {
		console.error('Delete user error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to delete user'
		});
	}
}

const toggleActive = async (req, res) =>{
	try {
		const {userId} = req.params;
		console.log('Toggle active userId: ', userId);
		const result = await authService.toggleActive(userId);	
		console.log('Toggle active result: ', result);
		return res.status(200).json({
			success: true,
			message: 'User status updated successfully',
			data: result
		})
	} catch (error) {
		console.error('Toggle active error: ', error.message);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update user status'
		});
	}
}

module.exports = {
	createUser,
	login,
	changePassword,
	updateUser,
	resetPassword,
	forgotPassword,
	getUsers,
	getUserId,
	deleteUser,
	toggleActive
};