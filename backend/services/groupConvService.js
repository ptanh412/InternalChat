const Department = require("../models/Department")
const Conversations = require("../models/Conversations");
const Users = require("../models/Users");
const Permissions = require("../models/Permissions");

const createDeparmentGroup = async (departmentId, name, permissions, adminId)=>{
	try {
		const department = await Department.findById(departmentId);

		if (!department) throw new Error('Department not found');

		const departmentMembers = await Users.find({department: departmentId}, '_id');	
		const memberIds = departmentMembers.map(member => member._id);

		const conversation = new Conversations({
			type: 'deparment',
			name: name || department.name,
			participants: memberIds,
			creator: adminId,
			admin: [adminId],
			departmentId: departmentId,
			permissions:{
				canPost: permissions.canPost || 'admin',
				canAddMember: permissions.canAddMember || 'admin',
			}
		})

		await conversation.save();

		department.conversationId = conversation._id;
		await department.save();
		return conversation;
	} catch (error) {
		throw error;
	}
}

const assignCustomPermissions = async(userId, permissionsData) =>{
	try{
		const user  = await Users.findById(userId);

		if (!user) throw new Error('User not found');

		let customePermissions;

		if (user.customPermissions){
			customePermissions = await Permissions.findById(user.customPermissions);

			if (customePermissions){
				Object.keys(permissionsData).forEach(key =>{
					customePermissions[key] = permissionsData[key];
				});
				customePermissions.updatedAt = new Date();
				await customePermissions.save();
			}else{
				customePermissions = new Permissions({
					name: `${user.name}_custom_permissions`,
					scope: 'global',
					...permissionsData
				});
				await customePermissions.save();

				user.customPermissions = customePermissions._id;
				await user.save();
			}
		}else{
			customePermissions = new Permissions({
				name: `${user.name}_custom_permissions`,
				scope: 'global',
				...permissionsData
			});
			await customePermissions.save();

			user.customPermissions = customePermissions._id;
			await user.save();
		}

		return customePermissions;
	}catch(error){
		throw error;
	}
}

module.exports = {
	createDeparmentGroup,
	assignCustomPermissions
}