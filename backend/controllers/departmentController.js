const { validationResult } = require('express-validator');
const departmentService = require('../services/departmentService');

const create = async (req, res) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		};

		const { name, header, description } = req.body;

		const result = await departmentService.createDepartment(name, header, description);

		return res.status(201).json({
			success: true,
			message: 'Department created successfully',
			data: result
		});
	} catch (error) {
		console.error('Create department error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to create department'
		});
	}
}

const update = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { departmentId } = req.params;
		// Make sure updateData is correctly extracted from req.body
		const updateData = req.body;

		// If your input has "updateData" as a wrapper, extract it
		const dataToUpdate = updateData.updateData || updateData;

		const result = await departmentService.updateDepartment(departmentId, dataToUpdate);

		return res.status(200).json({
			success: true,
			message: 'Department updated successfully',
			data: result
		});
	} catch (error) {
		console.error('Update department error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update department'
		});
	}
};

const remove = async (req, res) => {
	try {
		const { departmentId } = req.params;

		const result = await departmentService.deleteDepartment(departmentId);

		return res.status(200).json({
			success: true,
			message: 'Department deleted successfully',
			data: result
		});
	} catch (error) {
		console.error('Delete department error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to delete department'
		});
	}
};

const getAllDepartment = async (req, res) => {
	try {
		const result = await departmentService.getDepartment();

		return res.status(200).json({
			success: true,
			message: 'Departments fetched successfully',
			data: result
		});
	} catch (error) {
		console.error('Fetch departments error: ', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to fetch departments'
		});
	}
};

module.exports = {
	create,
	update,
	remove,
	getAllDepartment
};