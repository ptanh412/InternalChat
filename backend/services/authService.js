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
const ConversationMember = require('../models/ConversationMember.js');
const socketService = require('./socketService.js');
dotenv.config();

const createUser = async (userData) => {
	try {
		const emailExists = await Users.findOne({ email: userData.email });
		if (emailExists) throw new Error('Email already exists');

		if (!userData.employeeId) {
			const counter = await Counters.findOneAndUpdate(
				{ name: '' },
				{ $inc: { seq: 1 } },
				{ new: true, upsert: true }
			);

			userData.employeeId = `IC${counter.seq.toString().padStart(3, '0')}`;
		} else {
			const employeeIdExists = await Users.findOne({ employeeId: userData.employeeId });
			if (employeeIdExists) throw new Error('Employee ID already exists');
		}

		// if (userData.department) {
		// 	if (typeof userData.department === 'string' && !mongoose.Types.ObjectId.isValid(userData.department)) {
		// 		let department = await Department.findOne({
		// 			name: { $regex: new RegExp(userData.department, 'i') }
		// 		})

		// 		if (!department) {
		// 			department = new Department({
		// 				name: userData.department,
		// 				description: `${userData.department} Department`
		// 			});
		// 			await department.save();
		// 		}
		// 		userData.department = department._id;
		// 	} else {
		// 		const department = await Department.findById(userData.department);
		// 		if (!department) {
		// 			throw new Error('Invalid department ID');
		// 		}
		// 	}
		// }

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

		if (userData.department) {
			const department = await Department.findById(userData.department);

			if (userData.position === 'Department Head') {
				if (department.header) {
					if (!department.members.includes(department.header)) {
						department.members.push(department.header);
					}
				}
				department.header = user._id;
			} else {
				await Department.findByIdAndUpdate(userData.department, {
					$addToSet: { members: user._id }
				})
				await department.save();
			}
			if (department.conversationId) {
				const conversation = await Conversations.findById(department.conversationId);

				if (roleName === 'department_head') {
					const currentAdmin = await ConversationMember.findOne({
						conversationId: conversation._id,
						role: 'admin'
					});

					if (currentAdmin) {
						await ConversationMember.updateOne(
							{ _id: currentAdmin._id },
							{
								role: 'member',
								permissions: {
									canChat: false,
									canAddMembers: false,
									canRemoveMembers: false,
									canEditConversation: false,
									canAssignDeputies: false
								}
							}
						)
					}

					await ConversationMember.create({
						conversationId: conversation._id,
						memberId: user._id,
						role: 'admin',
						permissions: {
							canChat: true,
							canAddMembers: true,
							canRemoveMembers: true,
							canEditConversation: true,
							canAssignDeputies: true
						}
					})

					await socketService.getSocket().createPersonalizedSystemmessage({
						conversationId: conversation._id,
						actorId: user._id,
						action: 'update_role',
						data: {
							newRole: 'admin'
						}
					})
				} else if (roleName === 'deputy_head') {
					const currentDeputyAdmin = await ConversationMember.findOne({
						conversationId: conversation._id,
						role: 'deputy_admin'
					});

					if (currentDeputyAdmin) {
						await ConversationMember.updateOne(
							{ _id: currentDeputyAdmin._id },
							{
								role: 'member',
								permissions: {
									canChat: false,
									canAddMembers: false,
									canRemoveMembers: false,
									canEditConversation: false,
									canAssignDeputies: false
								}
							}
						)
					};

					await ConversationMember.create({
						conversationId: conversation._id,
						memberId: user._id,
						role: 'deputy_admin',
						permissions: {
							canChat: true,
							canAddMembers: true,
							canRemoveMembers: true,
							canEditConversation: true,
							canAssignDeputies: false
						}
					});

					await socketService.getSocket().createPersonalizedSystemmessage({
						conversationId: conversation._id,
						actorId: user._id,
						action: 'update_role',
						data: {
							newRole: 'deputy_admin'
						}
					})
				} else {
					await ConversationMember.create({
						conversationId: conversation._id,
						memberId: user._id,
						role: 'member',
						permissions: {
							canChat: false,
							canAddMembers: false,
							canRemoveMembers: false,
							canEditConversation: false,
							canAssignDeputies: false
						}
					})
				}
			}
		}

		const userSettings = new UserSetting({
			userId: user._id
		});
		await userSettings.save();
		const result = user.toObject();

		await socketService.getSocket().notifyUserCreate(result);
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

		const originalValues = {
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

		let oldDepartmentId = user.department;
		let newDepartmentId = null;

		if (updateData.department && typeof updateData.department === 'string') {
			let department = await Department.findOne({
				name: { $regex: new RegExp(updateData.department, 'i') }
			});

			if (!department) {
				department = new Department({
					name: updateData.department,
					description: `${updateData.department} Department`
				});
				await department.save();
			}
			updateData.department = department._id;
			newDepartmentId = department._id;
		} else if (updateData.department) {
			newDepartmentId = updateData.department;
		}

		if (updateData.password) {
			updateData.password = await hashPassword(updateData.password);
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
		};

		const adminPermissions = {
			canChat: true,
			canAddMembers: true,
			canRemoveMembers: true,
			canEditConversation: true,
			canAssignDeputies: true
		}

		const deputyAdminPermissions = {
			canChat: true,
			canAddMembers: true,
			canRemoveMembers: true,
			canEditConversation: true,
			canAssignDeputies: true
		}

		const memberPermissions = {
			canChat: false,
			canAddMembers: false,
			canRemoveMembers: false,
			canEditConversation: false,
			canAssignDeputies: false
		}

		const isPositionChanged = updateData.position && updateData.position !== user.position;
		const isDepartmentChanged = newDepartmentId && !oldDepartmentId?.equals(newDepartmentId);

		if (isPositionChanged) {
			const roleName = positionToRoleMap[updateData.position] || 'user';
			const role = await Roles.findOne({ name: roleName });

			if (role) {
				user.role = role._id;
				const rolePermissions = await Roles.findById(role._id).populate('permissions');
				if (rolePermissions && rolePermissions.permissions) {
					user.role.permissions = rolePermissions.permissions;
				}
			}
		}

		if (isDepartmentChanged && oldDepartmentId) {
			await removeUserFromDepartment(userId, oldDepartmentId);
		}

		await handleDepartmentPositionChanges(user, updateData, oldDepartmentId, newDepartmentId, adminPermissions, deputyAdminPermissions, memberPermissions);

		Object.keys(updateData).forEach(key => {
			user[key] = updateData[key];
		})
		user.updatedAt = new Date();
		await user.save();

		if (newDepartmentId) {
			await addUserToDepartment(userId, newDepartmentId);
		}

		if (isDepartmentChanged) {
			await addUserToConvDept(userId, newDepartmentId, updateData.position);
		}

		await helpers.createUpdateNotification(user, originalValues, updateData, adminUser);
		const santizedUser = user.toObject();
		delete santizedUser.password;

		await socketService.getSocket().notifyUserUpdate(santizedUser);

		const result = user.toObject();
		delete result.password;
		return result;
	} catch (error) {
		throw error;
	}
}

const handleDepartmentPositionChanges = async (user, updateData, oldDepartmentId, newDepartmentId, adminPermissions, deputyAdminPermissions, memberPermissions) => {
	try {

		if (!updateData.position || updateData.position === user.position) return;

		const targetDepartmentId = oldDepartmentId || newDepartmentId;

		if (!targetDepartmentId) return;

		const department = await Department.findById({ _id: targetDepartmentId });
		if (!department) return;

		if (updateData.position === 'Department Head') {
			const isCurrentDeputy = department.deputyHeader && department.deputyHeader.equals(user._id);
			if (department.header) {
				const currentHead = await Users.findById(department.header);
				if (currentHead && !currentHead._id.equals(user._id)) {
					const userRole = await Roles.findOne({ name: 'user' });
					const currentHeadUpdate = {
						position: 'Employee',
						role: userRole._id,
						updatedAt: new Date()
					}
					await Users.findByIdAndUpdate(
						currentHead._id,
						currentHeadUpdate,
						{ new: true }
					)

					if (department.conversationId) {
						await demoteUserInConversation(
							department.conversationId,
							currentHead._id,
							'admin',
							memberPermissions
						);
					}

					await socketService.getSocket().notifyUserUpdate(currentHeadUpdate);
				}
			}
			const updateObj = {
				header: user._id,
				updatedAt: new Date()
			};

			if (isCurrentDeputy) {
				updateObj.deputyHeader = null;
			}
			await Department.findByIdAndUpdate(
				department._id,
				updateObj,
				{ new: true }
			)

			if (department.conversationId) {
				await updateUserConversation(
					department.conversationId,
					user._id,
					'admin',
					adminPermissions
				);
				await socketService.getSocket().createPersonalizedSystemmessage({
					conversationId: department.conversationId,
					actorId: user._id,
					action: 'update_role',
					data: {
						newRole: 'admin'
					}
				})
			}

		} else if (updateData.position === 'Deputy Department') {
			department.deputyHeader = user._id;

			if (department.conversationId) {
				await updateUserConversation(
					department.conversationId,
					user._id,
					'deputy_admin',
					deputyAdminPermissions
				);
				await socketService.getSocket().createPersonalizedSystemmessage({
					conversationId: department.conversationId,
					actorId: user._id,
					action: 'update_role',
					data: {
						newRole: 'deputy_admin'
					}
				})
			}
		} else if (user.position === 'Department Head' && department.header && department.header.equals(user._id)) {
			await Department.findByIdAndUpdate(
				department._id,
				{
					header: null,
					updatedAt: new Date()
				},
				{ new: true }
			)

			if (department.conversationId) {
				await demoteUserInConversation(
					department.conversationId,
					user._id,
					'admin',
					memberPermissions
				);
			}
		} else if (user.position === 'Deputy Department' && department.deputyHeader && department.deputyHeader.equals(user._id)) {
			await Department.findByIdAndUpdate(
				department._id,
				{
					deputyHeader: null,
					updatedAt: new Date()
				},
				{ new: true }
			)

			if (department.conversationId) {
				await demoteUserInConversation(
					department.conversationId,
					user._id,
					'deputy_admin',
					memberPermissions
				);
			}
		}

		if (!department.members.includes(user._id)) {
			await Department.findByIdAndUpdate(
				department._id,
				{
					$push: { members: user._id },
					updatedAt: new Date()
				},
				{ new: true }
			)
		}

		department.updatedAt = new Date();
		await department.save();
	} catch (error) {
		console.log('Error in handleDepartmentPositionChanges', error);
		throw error;
	}
}

const updateUserConversation = async (conversationId, userId, role, permissions) => {
	if (!conversationId) return;

	const memberInConversation = await ConversationMember.findOne({
		conversationId: conversationId,
		memberId: userId
	});

	if (memberInConversation) {
		await ConversationMember.updateOne(
			{ _id: memberInConversation._id },
			{
				role,
				permissions
			}
		)
	} else {
		await ConversationMember.create({
			conversationId,
			memberId: userId,
			role,
			permissions
		});
	}
}

const demoteUserInConversation = async (conversationId, userId, currentRole, newPermissions) => {
	if (!conversationId) return;

	const memberInConversation = await ConversationMember.findOne({
		conversationId: conversationId,
		memberId: userId,
	});

	if (memberInConversation) {
		await ConversationMember.updateOne(
			{ _id: memberInConversation._id },
			{
				role: 'member',
				permissions: newPermissions
			}
		);

		await socketService.getSocket().createPersonalizedSystemmessage({
			conversationId,
			actorId: userId,
			action: 'update_role',
			data: {
				newRole: 'member'
			}
		})
	}
};

const addUserToDepartment = async (userId, departmentId) => {
	const department = await Department.findById(departmentId);

	if (!department) return;

	if (!department.members.includes(userId)) {
		await Department.findByIdAndUpdate(departmentId, {
			$push: { members: userId },
			updatedAt: new Date()
		})
	}
}

const removeUserFromDepartment = async (userId, oldDepartmentId) => {
	try {
		const oldDepartment = await Department.findById(oldDepartmentId);

		if (!oldDepartment) return;

		const user = await Users.findById(userId);
		if (!user) return;

		const isHeadOfDepartment = oldDepartment.header && oldDepartment.header.equals(userId);
		const isDeputyHeadOfDepartment = oldDepartment.deputyHeader && oldDepartment.deputyHeader.equals(userId);

		await Department.findByIdAndUpdate(
			oldDepartmentId,
			{
				$pull: { members: userId },
				updatedAt: new Date()
			}
		);

		if (oldDepartment.conversationId) {
			await removeUserFromConvDept(oldDepartment.conversationId, userId);
		}

		if (isHeadOfDepartment) {
			await updateDepartmentHead(oldDepartment, userId);
		}

		if (isDeputyHeadOfDepartment) {
			await Department.findByIdAndUpdate(
				oldDepartment,
				{
					deputyHeader: null,
					updatedAt: new Date()
				}
			)
		}
	} catch (error) {
		console.log('Error in removeUserFromDepartment', error);
		throw error;
	}
}

const removeUserFromConvDept = async (conversationId, userId) => {
	try {
		const member = await ConversationMember.findOne({
			conversationId,
			memberId: userId
		});

		if (member) {
			const user = await Users.findById(userId);
			const userName = user ? user.name : 'Unknown User';

			try {
				await socketService.getSocket().createPersonalizedSystemmessage({
					conversationId,
					actorId: userId,
					action: 'remove_member',
					data: {
						removeMemberIds: [userId],
						removedMembers: [{ _id: userId, name: userName }]
					}
				})

			} catch (messageError) {
				console.log('Error in removeUserFromConvDept', messageError);
			}
			await ConversationMember.deleteOne({ _id: member._id });

		}
	} catch (error) {
		console.log('Error in removeUserFromConvDept', error);
		throw error;
	}
}

const updateDepartmentHead = async (department, oldHeadId) => {
	try {
		await Department.findByIdAndUpdate(
			department._id,
			{
				header: null,
				updatedAt: new Date()
			}
		);
		if (!department.conversationId) return;

		if (department.deputyHeader) {
			await updateUserConversation(
				department.conversationId,
				department.deputyHeader,
				'admin',
				{
					canChat: true,
					canAddMembers: true,
					canRemoveMembers: true,
					canEditConversation: true,
					canAssignDeputies: true
				}
			);

			await socketService.getSocket().createPersonalizedSystemmessage({
				conversationId: department.conversationId,
				actorId: department.deputyHeader,
				action: 'update_role',
				data: {
					newRole: 'admin'
				}
			})
			return;
		}

		const adminRole = await Roles.findOne({ name: 'admin' });

		if (adminRole) {
			const adminUser = await Users.findOne({ role: adminRole._id });

			if (adminUser && !adminUser._id.equals(oldHeadId)) {
				await updateUserConversation(
					department.conversationId,
					adminUser._id,
					'admin',
					{
						canChat: true,
						canAddMembers: true,
						canRemoveMembers: true,
						canEditConversation: true,
						canAssignDeputies: true
					}
				);

				await socketService.getSocket().createPersonalizedSystemmessage({
					conversationId: department.conversationId,
					actorId: adminUser._id,
					action: 'update_role',
					data: {
						newRole: 'admin'
					}
				})

				if (!department.members.includes(adminUser._id)) {
					await Department.findByIdAndUpdate(
						department._id,
						{
							$push: { members: adminUser._id },
							updatedAt: new Date()
						}
					)
				}
			}
		}
	} catch (error) {
		console.log('Error in updateDepartmentHead', error);
		throw error;
	}
}

const addUserToConvDept = async (userId, departmentId, position) => {
	const department = await Department.findById(departmentId);
	if (!department || !department.conversationId) return;

	let conversationId = department.conversationId;
	if (!conversationId) {
		const newConversation = await Conversations.create({
			type: 'department',
			name: department.name,
			creator: department.header || userId,
			departmentId: department._id
		});

		conversationId = newConversation._id;

		await Department.findByIdAndUpdate(
			departmentId,
			{
				conversationId: conversationId,
				updatedAt: new Date()
			}
		)
	}

	let role = 'member';
	let permissions = {
		canChat: false,
		canAddMembers: false,
		canRemoveMembers: false,
		canEditConversation: false,
		canAssignDeputies: false
	}

	if (position === 'Department Head') {
		role = 'admin';
		permissions = {
			canChat: true,
			canAddMembers: true,
			canRemoveMembers: true,
			canEditConversation: true,
			canAssignDeputies: true
		}
	} else if (position === 'Deputy Head') {
		role = 'deputy_admin';
		permissions = {
			canChat: true,
			canAddMembers: true,
			canRemoveMembers: true,
			canEditConversation: true,
			canAssignDeputies: false
		}
	}

	await updateUserConversation(conversationId, userId, role, permissions);
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

		await ConversationMember.deleteMany({ memberId: userId });

		await Department.deleteMany({ members: userId });

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
				populate: [
					{
						path: 'permissions',
						model: 'Permissions'
					},
					{
						path: 'customPermissions',
						model: 'Permissions'
					}
				]
			});
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
			permissions: {
				system: user.role.permissions.scope === 'system' ? user.role.permissions : user.role.customPermissions,
				conversation: user.role.permissions.scope === 'conversation_department' ? user.role.permissions : user.role.customPermissions,
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

const getUserById = async (userId) => {
	try {
		if (!userId) throw new Error('Invalid user ID');
		const user = await Users.findById(userId)
			.select('email name phoneNumber employeeId position department')
			.populate('department', 'name')

		return user;

	} catch (error) {
		throw error;
	}
}

module.exports = {
	createUser,
	login,
	changePassword,
	updateUser,
	deleteUser,
	resetPassword,
	getAllUsers,
	getUserById
};