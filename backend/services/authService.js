const Counters = require('../models/Counters.js');
const Conversations = require('../models/Conversations.js');
const Department = require('../models/Department.js');
const Users = require('../models/Users.js');
const UserSetting = require('../models/UserSetting.js');
const { hashPassword, comparePassword } = require('../utils/encryption');
const { generateToken } = require('../utils/jwt');
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
				await department.save();
			} else if (userData.position === 'Deputy Department') {
				if (department.deputyHeader) {
					if (!department.members.includes(department.deputyHeader)) {
						department.members.push(department.deputyHeader);
					}
				}
				department.deputyHeader = user._id;
				await department.save();
			} else {
				await Department.findByIdAndUpdate(userData.department, {
					$addToSet: { members: user._id }
				})
				await department.save();
			}
			if (department.conversationId) {
				const conversation = await Conversations.findById(department.conversationId);
				if (!conversation) {
					console.log('Conversation not found for department:', department._id);
				} else {

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

		const originalValues = {
			role: user.role,
			department: user.department,
			position: user.position
		}

		if (updateData.name && updateData.name !== user.name) {
			const nameExists = await Users.findOne({
				name: updateData.name
			});
			if (nameExists) throw new Error('Name already exists');
		}

		if (updateData.phoneNumber && updateData.phoneNumber !== user.phoneNumber) {
			const phoneNumberExists = await Users.findOne({
				phoneNumber: updateData.phoneNumber
			});
			if (phoneNumberExists) throw new Error('Phone number already exists');
		}
		if (updateData.address && updateData.address !== user.address) {
			const addressExists = await Users.findOne({
				address: updateData.address
			});
			if (addressExists) throw new Error('Phone number already exists');
		}
		if (updateData.email && updateData.email !== user.email) {
			const emailExists = await Users.findOne({
				email: updateData.email
			});
			if (emailExists) throw new Error('Email already exists');
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

		await socketService.getSocket().createUpdateNotification(user, originalValues, updateData, adminUser);
		await socketService.getSocket().emitRoleUpdate({
			userId: user._id,
			oldDepartmentId: oldDepartmentId,
			newDepartmentId: newDepartmentId,
			oldPosition: originalValues.position,
			newPosition: updateData.position,
			adminId: adminUser
		});

		// Fetch the updated user with populated department information
		const updatedUser = await Users.findById(userId)
			.select('email name phoneNumber employeeId position department address createdAt updatedAt')
			.populate('department', 'name');

		const result = updatedUser.toObject();
		delete result.password;
		await socketService.getSocket().notifyUserUpdate(result);
		return result;
	} catch (error) {
		throw error;
	}
}

const handleDepartmentPositionChanges = async (user, updateData, oldDepartmentId, newDepartmentId, adminPermissions, deputyAdminPermissions, memberPermissions) => {
	try {

		if (oldDepartmentId && (!newDepartmentId || !oldDepartmentId.equals(newDepartmentId))) {
			console.log('Handling old department changes');
			await handleOldDepartmentPositionChanges(user, oldDepartmentId, memberPermissions);
		}
		if (newDepartmentId) {
			try {
				await handleNewDepartmentPositionChanges(user, newDepartmentId, updateData.position, adminPermissions, deputyAdminPermissions, memberPermissions);
				console.log('Successfully handled new department position changes');
			} catch (error) {
				console.error('Error in handleNewDepartmentPositionChanges:', error);
				throw error;
			}
		} else {
			console.log('Skipping new department position changes - no new department detected');
		}

	} catch (error) {
		console.log('Error in handleDepartmentPositionChanges', error);
		throw error;
	}
};

const handleOldDepartmentPositionChanges = async (user, oldDepartmentId, memberPermissions) => {
	const oldDepartment = await Department.findById(oldDepartmentId);
	if (!oldDepartment) return;

	const isHeadOfDepartment = oldDepartment.header && oldDepartment.header.equals(user._id);
	const isDeputyHeadOfDepartment = oldDepartment.deputyHeader && oldDepartment.deputyHeader.equals(user._id);

	if (isHeadOfDepartment) {
		await updateDepartmentHead(oldDepartment, user._id);
	}

	if (isDeputyHeadOfDepartment) {
		await Department.findByIdAndUpdate(
			oldDepartment._id,
			{
				deputyHeader: null,
				updatedAt: new Date()
			}
		)
	}
	if (oldDepartment.conversationId) {
		await demoteUserInConversation(
			oldDepartment.conversationId,
			user._id,
			'member',
			memberPermissions
		);
	}
}

const handleNewDepartmentPositionChanges = async (user, newDepartmentId, newPosition, adminPermissions, deputyAdminPermissions, memberPermissions) => {
	const newDepartment = await Department.findById(newDepartmentId);
	console.log('New department:', newDepartmentId, 'with position:', newPosition);
	if (!newDepartment) return;

	if (newPosition === 'Department Head') {

		if (newDepartment.header && !newDepartment.header.equals(user._id)) {
			const currentHead = await Users.findById(newDepartment.header);
			console.log('Current department head:', currentHead ? currentHead.name : 'None');


			if (currentHead && !currentHead._id.equals(user._id)) {
				console.log('Demoting current department head to Employee');

				const userRole = await Roles.findOne({ name: 'user' });
				const currentHeadUpdate = {
					position: 'Employee',
					role: userRole._id,
					updatedAt: new Date()
				};

				const updatedHead = await Users.findByIdAndUpdate(
					currentHead._id,
					currentHeadUpdate,
					{ new: true }
				);
				console.log('Updated head result:', updatedHead ? updatedHead.name : 'Failed to update');

				if (newDepartment.conversationId) {
					await demoteUserInConversation(
						newDepartment.conversationId,
						currentHead._id,
						'member',
						memberPermissions
					);
					console.log('Demoted user in conversation');
				}
				if (updatedHead) {
					const headResult = updatedHead.toObject();
					delete headResult.password;
					await socketService.getSocket().notifyUserUpdate(headResult);
					console.log('Sent notification for head update');

				}
			}
		}
		const isCurrentDeputy = newDepartment.deputyHeader;
		console.log('Is current user a deputy?', isCurrentDeputy);

		const updateObj = {
			header: user._id,
			updatedAt: new Date()
		};
		// if (isCurrentDeputy) {
		// 	updateObj.deputyHeader = null;
		// }
		await Department.findByIdAndUpdate(
			newDepartment._id,
			updateObj,
			{ new: true }
		);

		if (newDepartment.conversationId) {
			await handleSystemAdminInConv(newDepartment.conversationId, user._id, newDepartment._id, memberPermissions);
			await updateUserConversation(
				newDepartment.conversationId,
				user._id,
				'admin',
				adminPermissions
			);
		}
	} else if (newPosition === 'Deputy Department') {
		await Department.findByIdAndUpdate(
			newDepartment._id,
			{
				deputyHeader: user._id,
				updatedAt: new Date()
			},
			{ new: true }
		);

		if (newDepartment.conversationId) {
			await updateUserConversation(
				newDepartment.conversationId,
				user._id,
				'deputy_admin',
				deputyAdminPermissions
			);
		}
		///
	} else {
		if (newDepartment.conversationId) {
			await updateUserConversation(
				newDepartment.conversationId,
				user._id,
				'member',
				memberPermissions
			);
		}
	}

	if (!newDepartment.members.includes(user._id)) {
		await Department.findByIdAndUpdate(
			newDepartment._id,
			{
				$push: { members: user._id },
				updatedAt: new Date()
			},
			{ new: true }
		)
	}
}

const handleSystemAdminInConv = async (conversationId, newHeadId, departmentId, memberPermissions) => {
	try {
		const adminRole = await Roles.findOne({ name: 'admin' });
		if (!adminRole) return;

		const adminUser = await Users.findOne({ role: adminRole._id });
		if (!adminUser) return;

		const department = await Department.findById(departmentId);
		if (!department) return;

		const adminMember = await ConversationMember.findOne({
			conversationId,
			memberId: adminUser._id
		});

		if (adminMember){
			const adminIsDeptMember = department && department.members.some(
				member => member.equals(adminUser._id)
			)

			if (adminIsDeptMember) {
				await ConversationMember.updateOne(
					{ _id: adminMember._id },
					{
						role: 'member',
						permissions: memberPermissions
					}
				);
				console.log('System admin demoted to member in conversation');
			} else {
				await ConversationMember.deleteOne({ _id: adminMember._id });
				console.log('System admin removed from conversation');
			}
		}

		if (department.deputyHeader && !department.deputyHeader.equals(newHeadId)) {
			const deputyMember = await ConversationMember.findOne({
				conversationId,
				memberId: department.deputyHeader
			});

			if (deputyMember && deputyMember.role === 'admin') {
				await ConversationMember.updateOne(
					{ _id: deputyMember._id },
					{
						role: 'deputy_admin',
						permissions: {
							canChat: true,
							canAddMembers: true,
							canRemoveMembers: true,
							canEditConversation: true,
							canAssignDeputies: false
						}
					}
				);
				console.log('Deputy admin demoted to deputy admin in conversation');
			}
		}
	} catch (error) {
		console.log('Error in handleSystemAdminInConv', error);
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

const demoteUserInConversation = async (conversationId, userId, role, newPermissions) => {
	if (!conversationId) return;

	const memberInConversation = await ConversationMember.findOne({
		conversationId: conversationId,
		memberId: userId,
	});

	if (memberInConversation) {
		await ConversationMember.updateOne(
			{ _id: memberInConversation._id },
			{
				role,
				permissions: newPermissions
			}
		);
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
				oldDepartment._id,
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
			await ConversationMember.deleteOne({ _id: member._id });
		}
	} catch (error) {
		console.log('Error in removeUserFromConvDept', error);
		throw error;
	}
}

const updateDepartmentHead = async (department, oldHeadId) => {
    try {
        const currentDepartment = await Department.findById(department._id);
        console.log('Current department:', currentDepartment);
        console.log('Deputy head:', currentDepartment.deputyHeader);
        console.log('Conversation ID:', currentDepartment.conversationId);
        if (!currentDepartment) return;

        if (currentDepartment.deputyHeader && currentDepartment.conversationId) {
            console.log('Promoting deputy head to admin in conversation', currentDepartment.deputyHeader);
            await updateUserConversation(
                currentDepartment.conversationId,
                currentDepartment.deputyHeader,
                'admin',
                {
                    canChat: true,
                    canAddMembers: true,
                    canRemoveMembers: true,
                    canEditConversation: true,
                    canAssignDeputies: true
                }
            );
            console.log('Deputy head promoted to admin in conversation');

            // Demote trưởng phòng cũ nếu họ vẫn còn trong conversation
            if (oldHeadId && currentDepartment.members.some(member => member.equals(oldHeadId))) {
                await demoteUserInConversation(
                    currentDepartment.conversationId,
                    oldHeadId,
                    'member',
                    {
                        canChat: false,
                        canAddMembers: false,
                        canRemoveMembers: false,
                        canEditConversation: false,
                        canAssignDeputies: false
                    }
                );
                console.log('Old head demoted to member in conversation');
            }
        } else if (currentDepartment.conversationId) {
            const adminRole = await Roles.findOne({ name: 'admin' });
            const adminUser = adminRole ? await Users.findOne({ role: adminRole._id }) : null;

            if (adminUser) {
                const adminMember = await ConversationMember.findOne({ conversationId: currentDepartment.conversationId, memberId: adminUser._id });
                if (!adminMember) {
                    await ConversationMember.create({
                        conversationId: currentDepartment.conversationId,
                        memberId: adminUser._id,
                        role: 'admin',
                        permissions: {
                            canChat: true,
                            canAddMembers: true,
                            canRemoveMembers: true,
                            canEditConversation: true,
                            canAssignDeputies: true
                        }
                    });
                    console.log('System admin added as admin to conversation (no deputy)');
                } else if (adminMember.role !== 'admin') {
                    await ConversationMember.updateOne(
                        { _id: adminMember._id },
                        {
                            role: 'admin',
                            permissions: {
                                canChat: true,
                                canAddMembers: true,
                                canRemoveMembers: true,
                                canEditConversation: true,
                                canAssignDeputies: true
                            }
                        }
                    );
                    console.log('System admin updated to admin role in conversation (no deputy)');
                }
                // Demote trưởng phòng cũ nếu họ vẫn còn trong conversation
                if (oldHeadId && currentDepartment.members.some(member => member.equals(oldHeadId))) {
                    await demoteUserInConversation(
                        currentDepartment.conversationId,
                        oldHeadId,
                        'member',
                        {
                            canChat: false,
                            canAddMembers: false,
                            canRemoveMembers: false,
                            canEditConversation: false,
                            canAssignDeputies: false
                        }
                    );
                    console.log('Old head demoted to member in conversation (no deputy)');
                }
            }
        }

        await Department.findByIdAndUpdate(
            currentDepartment._id,
            {
                header: null,
                updatedAt: new Date()
            },
            { new: true }
        );

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
		};

		await handleSystemAdminInConv(conversationId, userId, departmentId, {
			canChat: false,
			canAddMembers: false,
			canRemoveMembers: false,
			canEditConversation: false,
			canAssignDeputies: false
		});
	} else if (position === 'Deputy Department') {
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

const toggleActive  = async (userId) => {
	try{
		const user = await Users.findById(userId);
		if(!user) throw new Error('User not found');

		user.active = !user.active;
		await user.save();
		
		// Fetch the updated user with populated department information
		const updatedUser = await Users.findById(userId)
			.select('email name phoneNumber employeeId position department address createdAt updatedAt active')
			.populate('department', 'name');
		
		const result = updatedUser.toObject();
		delete result.password;
		await socketService.getSocket().toggleActive({
			userId: user._id,
			isActive: user.active
		});
		return result;
	}catch(error){
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
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD
	}
})
const forgotPassword = async (email) => {
	try {
		const user = await Users.findOne({ email });
		if (!user) throw new Error('User not found');

		const resetToken = crypto.randomBytes(32).toString('hex');

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
		await user.save();

		const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

		await transporter.sendMail({
			from: `InternalChat Admin <${process.env.EMAIL_USER}>`,
			to: email,
			subject: 'Password Reset - InternalChat',
			html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
			  <h2 style="color: #2c3e50; text-align: center;">Password Reset</h2>
			  <p>Hello ${user.name},</p>
			  <p>You requested a password reset for your InternalChat account.</p>
			  <p>Please click the button below to reset your password:</p>
			  <div style="text-align: center; margin: 25px 0;">
				<a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
			  </div>
			  <p>This link will expire in 1 hour.</p>
			  <p style="color: #e74c3c;"><strong>Note:</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
			  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
			  <p style="color: #7f8c8d; font-size: 12px; text-align: center;">This is an automated message. Please do not reply to this email.</p>
			</div>
			`
		});
		return true;
	} catch (error) {
		throw error;
	}
}
const resetPassword = async (token, newPassword) => {
	try {
		const user = await Users.findOne({
			resetPasswordToken: token,
			resetPasswordExpires: { $gt: Date.now() }
		});
		if (!user) throw new Error('User not found');

		user.password = await hashPassword(newPassword);
		user.resetPasswordToken = undefined;
		user.resetPasswordExpires = undefined;
		user.updatedAt = new Date();
		await user.save();

		await transporter.sendMail({
			from: `InternalChat Admin <${process.env.EMAIL_USER}>`,
			to: user.email,
			subject: 'Password Changed - InternalChat',
			html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
			  <h2 style="color: #2c3e50; text-align: center;">Password Changed</h2>
			  <p>Hello ${user.name},</p>
			  <p>Your password for InternalChat has been successfully changed.</p>
			  <p>If you did not make this change, please contact your administrator immediately.</p>
			  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
			  <p style="color: #7f8c8d; font-size: 12px; text-align: center;">This is an automated message. Please do not reply to this email.</p>
			</div>
			`
		});
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
			.select('email name phoneNumber employeeId position department status address createdAt updatedAt active')
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
			.select('email name phoneNumber employeeId position department address createdAt updatedAt')
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
	forgotPassword,
	resetPassword,
	getAllUsers,
	getUserById,
	toggleActive
};