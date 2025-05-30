// const Department = require("../models/Department");
// const Notifications = require("../models/Notifications");
// const Roles = require("../models/Roles");

// const createUpdateNotification = async (user, originalValues, updateData, adminUser) => {
	
// 	// const notifications = [];
// 	// if (updateData.role && updateData.role !== originalValues.role?.toString()) {
// 	// 	const newRole = await Roles.findById(updateData.role).select('name');
// 	// 	notifications.push({
// 	// 		sender: adminUser ? adminUser._id : null,
// 	// 		received: user._id,
// 	// 		content: `Your role has been updated to ${newRole.name}`,
// 	// 		type: 'message'
// 	// 	})
// 	// }
// 	// if (updateData.department && updateData.department !== originalValues.department?.toString()) {
// 	// 	const newDept = await Department.findById(updateData.department).select('name');

// 	// 	notifications.push({
// 	// 		sender: adminUser ? adminUser._id : null,
// 	// 		received: user._id,
// 	// 		content: `You have been moved to ${newDept.name} department`,
// 	// 		type: 'message'
// 	// 	});
// 	// }
// 	// if (updateData.position && updateData.position !== originalValues.position) {
// 	// 	notifications.push({
// 	// 		sender: adminUser ? adminUser._id : null,
// 	// 		received: user._id,
// 	// 		content: `Your position has been updated to ${updateData.position}`,
// 	// 		type: 'message'
// 	// 	});
// 	// };
// 	// if (notifications.length > 0) {
// 	// 	await Notifications.insertMany(notifications);
// 	// }

// 	try{
// 		if (!updateData.position) return;

// 		const notifications = [];

// 		const isPositionChanges = updateData.position && updateData.position !== originalValues.position;
// 		const isDepartmentChanges = updateData.department && (!originalValues.department || !updateData.department.equals(originalValues.department));

// 		if (isPositionChanges && !isDepartmentChanges && originalValues.department){
// 			const department = await Department.findById(originalValues.department).select('name');

// 			if (department){
// 				const metadata = {
// 					departmentName: department.name,
// 					oldPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: originalValues.position,
// 					},
// 					newPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: updateData.position,
// 					}
// 				};

// 				const memberIds = department.members.filter(memberId => !memberId.equals(user._id));

// 				for (const memberId of memberIds){
// 					notifications.push({
// 						sender: adminUser._id,
// 						received: memberId,
// 						content: `${user.name} has changed position to ${updateData.position}`,
// 						type: 'system',
// 						metadata
// 					})
// 				}

// 				notifications.push({
// 					sender: adminUser._id,
// 					received: user._id,
// 					content: `You have changed position to ${updateData.position}`,
// 					type: 'system',
// 					metadata
// 				});
// 			}
// 		}
// 		if (isDepartmentChanges){
// 			const oldDepartment = originalValues.department ?
// 			await Department.findById(originalValues.department).select('name') : null;
// 			const newDepartment = updateData.department ?
// 			await Department.findById(updateData.department).select('name') : null;

// 			if (newDepartment){
// 				const metadata = {
// 					oldPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: originalValues.position,
// 					},
// 					newPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: updateData.position,
// 					},
// 					oldDepartment: oldDepartment ? {
// 						_id: originalValues._id,
// 						name: oldDepartment.name,
// 					} : null,
// 					newDepartment: {
// 						_id: updateData._id,
// 						name: newDepartment.name,
// 					}
// 				}

// 				const newDeptMembers = newDepartment.members.filter(memberId => !memberId.equals(user._id));

// 				for (const memberId of newDeptMembers){
// 					notifications.push({
// 						sender: adminUser._id,
// 						received: memberId,
// 						content: `${user.name} joined ${newDepartment.name}`,
// 						type: 'system',
// 						metadata
// 					})
// 				}
// 				notifications.push({
// 					sender: adminUser._id,
// 					received: user._id,
// 					content: `New member joined ${newDepartment.name}`,
// 					type: 'system',
// 					metadata
// 				});
// 			}
// 			if (oldDepartment){
// 				const oldDeptmetadata = {
// 					oldPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: originalValues.position,
// 					},
// 					newPosition: {
// 						_id: user._id,
// 						name: user.name,
// 						position: updateData.position || originalValues.position,
// 					},
// 					oldDepartment:  {
// 						_id: originalValues._id,
// 						name: oldDepartment.name,
// 					},
// 					newDepartment: newDepartment  ?  {
// 						_id: updateData._id,
// 						name: newDepartment.name,
// 					} : null
// 				}

// 				const oldDeptMembers  = oldDepartment.members.filter(memberId => !memberId.equals(user._id));

// 				for (const memberId of oldDeptMembers){
// 					notifications.push({
// 						sender: adminUser._id,
// 						received: memberId,
// 						content: `${user.name} removed from ${oldDepartment.name}`,
// 						type: 'system',
// 						metadata: oldDeptmetadata
// 					})
// 				}
// 			}
// 		}
// 		if (notifications.length > 0){
// 			await Notifications.insertMany(notifications);

// 			for (const notification of notifications){
// 				const socketId
// 			}
// 		}
// 	}catch(error) {
// 		console.error('Error creating update notification:', error.message);
// 		throw new Error('Failed to create update notification');
// 	}
// }

// module.exports = {
// 	createUpdateNotification
// };