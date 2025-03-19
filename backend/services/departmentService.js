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

module.exports = {
	createDepartment,
	updateDepartment,
	deleteDepartment,
	getDepartment
}