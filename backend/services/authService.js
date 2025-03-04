const Counters = require('../models/Counters.js');
const Conversations = require('../models/Conversations.js');
const Department = require('../models/Department.js');
const Users = require('../models/Users.js');
const UserSetting = require('../models/UserSetting.js');
const { hashPassword, comparePassword } = require('../utils/encryption');
const { generateToken } = require('../utils/jwt');
const helpers = require('../helper/user');
const Roles = require('../models/Roles.js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const createUser = async (userData) => {
	try {
		const emailExists = await Users.findOne({ email: userData.email });
		if (emailExists) throw new Error('Email already exists');

		if (!userData.employeeId) {
			const counter = await Counters.findOneAndUpdate(
				{ name: 'employeeId' },
				{ $inc: { seq: 1 } },
				{ new: true, upsert: true }
			);

			userData.employeeId = `IC${counter.seq.toString().padStart(3, '0')}`;
		} else {
			const employeeIdExists = await Users.findOne({ employeeId: userData.employeeId });
			if (employeeIdExists) throw new Error('Employee ID already exists');
		}

		if (userData.department && typeof userData.department === 'string') {
			let department = await Department.findOne({
				name: { $regex: new RegExp(userData.department, 'i') }
			})

			if (!department) {
				department = new Department({
					name: userData.department
				});
				await department.save();
			}
			userData.department = department._id;
		}

		const positionToRoleMap = {
			'Administrator': 'admin',
			'Director': 'user',
			'Deputy Director': 'user',
			'Secretary': 'user',
			'Department Head': 'department_head',
			'Deputy Department': 'deputy_head',
			'Project Leader': 'project_leader',
			'Employee': 'user'
		}

		const roleName = positionToRoleMap[userData.position] || 'user';
		const role = await Roles.findOne({ name: roleName });

		if (!role) throw new Error('Role not found');

		userData.role = role._id;

		userData.password = await hashPassword(userData.password);

		const user = new Users(userData);
		await user.save();

		if (userData.position === 'Department Head' && userData.department) {
			const department = await Department.findById(userData.department);

			if (department.header) {
				if (!department.members.includes(department.header)) {
					department.members.push(department.header);
				}
			}
			department.header = user._id;
			await department.save();
		} else if (userData.department) {
			await Department.findByIdAndUpdate(userData.department, {
				$addToSet: { members: user._id }
			})
		}

		const userSettings = new UserSetting({
			userId: user._id
		});
		await userSettings.save();

		const result = user.toObject();
		delete result.password;
		return result;
	} catch (error) {
		throw error;
	}
}

const updateUser = async (userId, updateData, adminUser = null) => {
	try {
		const user = await Users.findById(userId);
		if (!user) throw new Error('User not found');

		const originalValues  = {
			role: user.role,
			department: user.department,
			position: user.position
		}

		if (updateData.email && updateData.email !== user.email) {
			const emailExists = await Users.findOne({
				email: updateData.email
			});
			if (emailExists) throw new Error('Email already exists');
		}

		if (updateData.employeeId && updateData.employeeId !== user.employeeId) {
			const employeeIdExists = await Users.findOne({
				employeeId: updateData.employeeId
			});
			if (employeeIdExists) throw new Error('Employee ID already exists');
		}

		if (updateData.department && typeof updateData.department === 'string') {
			let department = await Department.findOne({
				name: { $regex: new RegExp(updateData.department, 'i') }
			});

			if (!department) {
				department = new Department({
					name: updateData.department
				});
				await department.save();
			}
			updateData.department = department._id;
		}

		if (updateData.password) {
			updateData.password = await hashPassword(updateData.password);
		}

		if (updateData.position && updateData.position !== user.position) {
			if (updateData.position === 'Department Head' && user.department) {
				await Department.findByIdAndUpdate(user.department, {
					header: user._id,
					updatedAt: new Date()
				})
			} else if (user.position === 'Department Head' && user.department) {
				const dept = await Department.findById(user.department);
				if (dept && dept.header?.toString() === userId) {
					dept.header = null;
					dept.updatedAt = new Date();
					await dept.save();
				}
			}
		}

		if (updateData.role && updateData.role !== user.role.toString()) {
			const newRole = await Roles.findById(updateData.role);
			if (!newRole) throw new Error('Role not found');

			user.role = newRole._id;
		}
		Object.keys(updateData).forEach(key => {
			if (key !== 'role'){
				user[key] = updateData[key];
			}
		});
		user.updatedAt = new Date();
		await user.save();

		await helpers.createUpdateNotification(user, originalValues, updateData, adminUser);

		const result = user.toObject();
		delete result.password;
		return result;
	} catch (error) {
		throw error;
	}
}

const deleteUser = async (userId) => {
	try {
		const user = await Users.findById(userId);

		if (!user) throw new Error('User not found');

		if (user.position === 'Department Head' && user.department) {
			const dept = await Department.findById(user.department);
			if (dept && dept.header?.toString() === userId) {
				dept.header = null;
				dept.updatedAt = new Date();
				await dept.save();
			}
		}

		await Conversations.updateMany(
			{ participants: user._id },
			{ $pull: { participants: user._id } }
		);

		await Conversations.updateMany(
			{ admins: userId },
			{ $pull: { admins: userId } }
		)

		await Conversations.updateMany(
			{ deputyadmins: userId },
			{ $pull: { deputyadmins: userId } }
		)

		await UserSetting.findOneAndDelete({ userId });

		await Users.findByIdAndDelete(userId);
		return true;
	} catch (error) {
		throw error;
	}
}
const login = async (userData) => {
	try {
		const user = await Users.findOne({ email: userData.email })
		.populate('department', 'name')
		.populate({
			path: 'role',
			populate: {
				path: 'permissions, customPermissions',
				model: 'Permissions'
			}
		})
		if (!user) throw new Error('Invalid email or password');

		const passwordMatch = await comparePassword(userData.password, user.password);
		if (!passwordMatch) throw new Error('Invalid email or password');

		const token = generateToken({ 
			userId: user._id,
			roleId: user.role._id,
		});
		user.lastActive = new Date();
		await user.save();

		const result = user.toObject();
		delete result.password;

		return {
			user: result,
			token,
			permissions:{
				system: user.role.permissions.scope === 'system' ? user.role.permissions: user.role.customPermissions,
				conversation: user.role.permissions.scope === 'conversation_department' ? user.role.permissions: user.role.customPermissions,
			}
		};
	} catch (error) {
		throw error;
	}
}

const changePassword = async (userId, currentPassword, newPassword) => {
	try {
		const user = await Users.findById(userId);
		if (!user) throw new Error('User not found');

		const passwordMatch = await comparePassword(currentPassword, user.password);

		if (!passwordMatch) throw new Error('Invalid current password');

		const hashedPassword = await hashPassword(newPassword);
		user.password = hashedPassword;
		await user.save();

		return true;
	}
	catch (error) {
		throw error;
	}
}

const resetPassword = async (email) => {
	try {
		const user = await Users.findOne({ email });
		if (!user) throw new Error('User not found');

		const newPassword = crypto.randomBytes(4).toString('hex');
		const hashedPassword = await hashPassword(newPassword);

		user.password = hashedPassword;
		user.updatedAt = new Date();
		await user.save();

		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.EMAIL,
				pass: process.env.EMAIL_PASSWORD
			}
		})

		await transporter.sendMail({
			from: `InternalChat Admin <${process.env.EMAIL}>`,
			to: email,
			subject: 'Password Reset - InternalChat',
			html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
				<h2 style="color: #2c3e50; text-align: center;">Password Reset</h2>
				<p>Hello ${user.name},</p>
				<p>Your password for InternalChat has been reset. Your new temporary password is:</p>
				<div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; text-align: center; font-family: monospace; font-size: 18px;">
					${newPassword}
				</div>
				<p>Please log in with this temporary password and change it immediately for security reasons.</p>
				<p style="color: #e74c3c;"><strong>Note:</strong> If you did not request this password reset, please contact your administrator immediately.</p>
				<hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
				<p style="color: #7f8c8d; font-size: 12px; text-align: center;">This is an automated message. Please do not reply to this email.</p>
			</div>
		`
		})
		return true;
	} catch (error) {
		throw error;
	}
}

const getAllUsers = async (queryParams = {}, page = 1, limit = 10) => {
	try {
		const filters = {};

		if (queryParams.department) {
			filters.department = queryParams.department;
		}
		if (queryParams.position) {
			filters.position = queryParams.position;
		}
		if (queryParams.status) {
			filters.status = queryParams.status;
		}
		if (queryParams.search) {
			const searchRegex = new RegExp(queryParams.search, 'i');
			filters.$or = [
				{ name: searchRegex },
				{ email: searchRegex },
				{ employeeId: searchRegex }
			];
		}

		const skip = (page - 1) * limit;
		const users = await Users.find(filters)
			.select('email name phoneNumber employeeId position department status')
			.populate('department', 'name')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const totalUsers = await Users.countDocuments(filters);

		return {
			users,
			pagination: {
				totalUsers,
				page: Number(page),
				limit: Number(limit),
				pages: Math.ceil(totalUsers / limit)
			}
		}
	} catch (error) {
		throw error;
	}
};

module.exports = {
	createUser,
	login,
	changePassword,
	updateUser,
	deleteUser,
	resetPassword,
	getAllUsers
};