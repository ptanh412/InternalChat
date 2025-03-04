const conversationService = require('../services/conversationService');

const createConversation = async (req, res) => {
	try {
		const userRole = req.user.role.name;

		if (userRole !== 'admin'){
			return res.status(403).json({
				success: false,
				message: 'You do not have permission to create a conversation'
			});
		};

		if (!req.body.departmetnId){
			return res.status(400).json({
				success: false,
				message: 'Department ID is required'
			});
		}

		const conversation = await conversationService.createConvDepartment(req.body, req.uer);

		return res.status(201).json({
			success: true,
			mwssage: 'Department Conversation created',
			data: conversation
		});
	}catch (error){

	}
}

const updateConvDepartment = async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        }

        // Update conversation
        const updatedConversation = await conversationService.updateConvDepartment(req.body, req.user);
        
        return res.status(200).json({
            success: true,
            message: 'Department conversation updated successfully',
            data: updatedConversation
        });
    } catch (error) {
        console.error('Update department conversation error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Controller for deleting a department conversation
 */
const deleteConvDepartment = async (req, res) => {
    try {
        // Validate required fields
        if (!req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        }

        // Delete conversation
        const result = await conversationService.deleteConvDepartment(req.params.id, req.user);
        
        return res.status(200).json({
            success: true,
            message: 'Department conversation deleted successfully'
        });
    } catch (error) {
        console.error('Delete department conversation error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

module.exports = {
    createConvDepartment,
    updateConvDepartment,
    deleteConvDepartment
};