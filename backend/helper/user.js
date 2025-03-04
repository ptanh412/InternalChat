const Department = require("../models/Department");
const Notifications = require("../models/Notifications");
const Roles = require("../models/Roles");

const createUpdateNotification = async (user, originalValues, updateData, adminUser) => {
	const notifications = [];

	if (updateData.role && updateData.role !== originalValues.role?.toString()) {
		const newRole = await Roles.findById(updateData.role).select('name');

		notifications.push({
			sender: adminUser ? adminUser._id : null,
			received: user._id,
			content: `Your role has been updated to ${newRole.name}`,
			type: 'message'
		})
	}

	if (updateData.department && updateData.department !== originalValues.department?.toString()) {
		const newDept = await Department.findById(updateData.department).select('name');

		notifications.push({
			sender: adminUser ? adminUser._id : null,
			received: user._id,
			content: `You have been moved to ${newDept.name} department`,
			type: 'message'
		});
	}

	if (updateData.position && updateData.position !== originalValues.position) {
		notifications.push({
			sender: adminUser ? adminUser._id : null,
			received: user._id,
			content: `Your position has been updated to ${updateData.position}`,
			type: 'message'
		});
	};

	if (notifications.length > 0) {
		await Notifications.insertMany(notifications);
	}
}

module.exports = {
	createUpdateNotification
};