const Conversations = require('../models/Conversations');
const Department = require('../models/Department');
const Permissions = require('../models/Permissions');
const Users = require('../models/Users');
const helper = require('../helper/permission');

const createConvDepartment = async (departmentData, creator) =>{
	try{
		const department = await Department.findById(departmentData.departmentId);
		if(!department) throw new Error('Department not found');

		const defaultDeptConvPermissions = await Permissions.findOne({
			name: 'çonversation_department_default',
			scope: 'conversation_department'
		});

		if (!defaultDeptConvPermissions){
			throw new Error('Default department conversation permissions not found');
		}

		const conversation = await Conversations.create({
			type: 'department',
			name: departmentData.name || department.name,
			avatarGroup: departmentData.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
			participants: department.members,
			creator: creator._id,
			departmentId: department._id,
			permissionSettings: defaultDeptConvPermissions ? defaultDeptConvPermissions._id : null,
			admins: [department.head],
			roleOverrides:{
				departmentHead: {canChat: true, canEditConversation: true},
				deputyHead: {canChat: true, canEditConversation: true},
				regularMember: {canChat: true,}
			}
		});

		const deputyHeads = await Users.find({
			department: department._id,
			position: 'Deputy Department'
		});

		if (deputyHeads.length > 0){
			conversation.deputyadmins = deputyHeads.map(deputy => deputy._id);
			await conversation.save();
		}

		department.conversationId = conversation._id;
		await department.save();

		return conversation;
	}catch(error){
		throw error;
	}
};

const updateConvDepartment = async (updateData, user) =>{
	try{
		const conversation = await  Conversations.findById(updateData.conversationId);
		if(!conversation || conversation.type !== 'department') throw new Error('Conversation not found');

		const permissions = await helper.getEffectivePermissions(user, conversation);
		if (!permissions.canEditConversation) throw new Error('Unauthorized');

		const department = await Department.findById(conversation.departmentId);
		if(!department) throw new Error('Department not found');

		const isAdmin = conversation.admins.some(admin => admin.toString() === user._id.toString());
		const isDeputyAdmin = conversation.deputyadmins.some(deputy => deputy.toString() === user._id.toString());

		if(!isAdmin && !isDeputyAdmin) throw new Error('Unauthorized');

		if (updateData.name){
			conversation.name = updateData.name;
		}

		if (updateData.avatarGroup){
			conversation.avatarGroup = updateData.avatarGroup;
		}

		if (updateData.addMembers && updateData.addMembers.length > 0){
			const departmenMembers = await Users.find({
				_id: {$in: department.members},
				deparment: department._id
			});

			const newMemberIds = departmenMembers.map(member => member._id);
			conversation.participants = [
				...conversation.participants.filter(participant => !newMemberIds.includes(participant)),
				...newMemberIds
			]

			department.members = [
				...department.members.filter(member => !newMemberIds.includes(member)),
				...newMemberIds
			]
		}

		if (updateData.removeMembers && updateData.removeMembers.length > 0){

			const safeToRemove = updateData.removeMembers.filter(memberId =>
				!conversation.admins.includes(memberId) &&
				!conversation.deputyadmins.includes(memberId)
			);

			conversation.participants = conversation.participants.filter(participant => !safeToRemove.includes(participant));

		}

		await conversation.save();
		return conversation;

	}catch(error){
		throw error;
	}
};

const deleteConvDepartment = async (conversationId, user) =>{
	try{
		const conversation = await Conversations.findById(conversationId);
		if(!conversation || conversation.type !== 'department') throw new Error('Conversation not found');

		const isAdmin = conversation.admins.some(admin => admin.toString() === user._id.toString());
		if(!isAdmin) throw new Error('Unauthorized');

		const department = await Department.findById(conversation.departmentId);
		if (department){
			department.conversationId = null;
			await department.save();
		};

		await Conversations.deleteOne({_id: conversationId});
		return {
			success: true,
			message: 'Department conversation deleted'
		}
	}catch(error){
		throw error;
	}
}

module.exports = {
	createConvDepartment,
	updateConvDepartment,
	deleteConvDepartment
}