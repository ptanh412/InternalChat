const Department = require("../models/Department");
const Users = require("../models/Users");

const createDepartment = async (name, headerId, description) =>{
	try {
		const existingDepartment = await Department.findOne({name});

		if(existingDepartment) throw new Error('Department already exists');

		if (headerId){
			const header = await Users.findById(headerId);
			if(!header) throw new Error('Header not found');
		}

		const department = new Department({
			name,
			header: headerId,
			description: description
		});

		await department.save();

		if (headerId){
			await Users.findByIdAndUpdate(headerId,{
				position: 'Department Head',
			})
		}
		return department;
	} catch (error) {
		throw error;
	}
}

const updateDepartment = async (departmentId, updateData) =>{
	try {
		const department = await Department.findById(departmentId);
		if(!department) throw new Error('Department not found');

		if (updateData.name){
			department.name = updateData.name;
		}

		if (updateData.description){
			department.description = updateData.description;
		}

		if (updateData.header && department.header?.toString() !== updateData.header){
			if (department.header){
				await Users.findByIdAndUpdate(department.header,{
					position: 'Employee',
				})
			}
			await Users.findByIdAndUpdate(updateData.header,{
				position: 'Department Head',
			});
		}

		if (updateData.deputyHeader && department.deputyHeader?.toString() !== updateData.deputyHeader){
			if (department.deputyHeader){
				await Users.findByIdAndUpdate(department.deputyHeader,{
					position: 'Employee',
				})
			}
			await Users.findByIdAndUpdate(updateData.deputyHeader,{
				position: 'Deputy Head',
			});
		}
		if (updateData.members && Array.isArray(updateData.members)) {
			// Gán trực tiếp mảng member mới
			department.members = updateData.members;
		  }

		  Object.keys(updateData).forEach(key => {
			if (key !== 'member') { // Bỏ qua member vì đã xử lý ở trên
			  department[key] = updateData[key];
			}
		  });
		department.updatedAt = new Date();

		await department.save();
		return department;
	} catch (error) {
		throw error;
	}
}

const deleteDepartment = async (departmentId) =>{
	try {
		const department = await Department.findById(departmentId);
		if(!department) throw new Error('Department not found');

		const userCount = await Users.countDocuments({department: departmentId});
		if (userCount > 0) throw new Error('Department has users');

		if (department.header){
			await Users.findByIdAndUpdate(department.header,{
				position: 'Employee',
			});
		}
		if (department.conversationId){
			await Conversation.findByIdAndDelete(department.conversationId);
		};
		await Department.findByIdAndDelete(departmentId);
		return true;
	} catch (error) {
		throw error;
	}
}

const getDepartment = async () =>{
	try{
		const departments = await Department.find().populate('header', 'name avatar').populate('members', 'name avatar');
		return departments;
	}catch(error){
		throw error;
	}
}
const getDepartmentMembers = async (departmentId) =>{
	try{
		const department = await Department.findById(departmentId);
		if (!department) throw new Error('Department not found');

		const members = await Users.find({department: departmentId})
		.select('name email employeeId avatar position phoneNumber address status lastActive');
		return members;
	}catch(error){
		throw error;
	}
}
const getDepartmentMemberDetails = async (memberId) =>{
	try{
		console.log(memberId);
		const member = await Users.findById(memberId)
		.select('-password -resetPasswordToken -resetPasswordExpires -__v')
		.populate('department', 'name');
		if (!member) throw new Error('Member not found');
		return member;
	}catch(error){
		throw error;
	}
}

const getCurrentUserDepartment = async (userId) =>{
	try{
		const user = await Users.findById(userId).populate('department', 'name');
		if (!user) throw new Error('User not found');

		const department = await Department.findById(user.department._id)
		.populate('header', 'name position')
		.populate('deputyHeader', 'name position');
		return department;
	}catch(error){
		throw error;
	}
}
module.exports = {
	createDepartment,
	updateDepartment,
	deleteDepartment,
	getDepartment,
	getDepartmentMembers,
	getDepartmentMemberDetails,
	getCurrentUserDepartment
}