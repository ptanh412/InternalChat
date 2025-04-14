const conversationService = require('../services/conversationService');

const createConvDepartment = async (req, res) => {
    try {
        console.log('Full Request:', req.body);
        console.log('User:', req.user);

        // Log chi tiết về role
        console.log('User Role:', req.user?.role?.name);

        // Thêm kiểm tra role chi tiết hơn
        if (!req.user || !req.user.role || req.user.role.name !== 'admin') {
            console.log('Permission Denied');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create a conversation'
            });
        }

        // Validate departmentId
        if (!req.body.departmentId) {
            console.log('Missing Department ID');
            return res.status(400).json({
                success: false,
                message: 'Department ID is required'
            });
        }

        // Log trước khi gọi service
        console.log('Calling createConvDepartment service');
        const conversation = await conversationService.createConvDepartment(req.body, req.user);

        // Log kết quả
        console.log('Conversation created:', conversation);

        return res.status(201).json({
            success: true,
            message: 'Department Conversation created',
            data: conversation
        });
    } catch (error) {
        // Log chi tiết lỗi
        console.error('Error in createConvDepartment:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
};

const updateConvDepartment = async (req, res) => {
    try {
        // Validate required fields
        if (!req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        }

        // Update conversation
        const updatedConversation = await conversationService.updateConvDepartment(
            req.params.id,
            req.body, 
            req.user
        );
        
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

const createConvGroup = async (req, res) =>{
    try{
        
        if (!req.body.name) throw new Error('Group name is required');
        if (!req.body.members || req.body.members.length < 2) throw new Error('Group must have at least 2 members');

        const group = await conversationService.createConvGroup(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: 'Group conversation created',
            data: group
        });
    }catch(error){
        console.error('Create group conversation error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

const updateAllMembersChatPermission = async (req, res) => {
    try{
        const  {conversationId, chatEnable} = req.body;

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        };

        if (chatEnable === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Chat permission is required'
            });
        };

        const result = await conversationService.updateAllMembersChat(conversationId, req.user._id, chatEnable);
        return res.status(200).json(result);
    }catch(error){
        console.error('Update all members chat permission error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

const assignDeputyAdmin = async (req, res) => {
    try{
        const {conversationId,  targetUserId} = req.body;

        if (!conversationId || !targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID and target user ID are required'
            });
        };

        const result = await conversationService.assignDeputyAdmin(conversationId,req.user._id, targetUserId);
        return res.status(200).json({
            success: true,
            message: 'Deputy admin assigned successfully'
        });
    }catch(error){
        console.error('Assign deputy admin error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

const transferAdminRole  = async (req, res) => {
    try{
        const {conversationId, newAdminId} = req.body;

        if (!conversationId || !newAdminId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID and new admin ID are required'
            });
        }

        const result = await conversationService.transferAdminRole(conversationId, req.user._id, newAdminId);

        return res.status(200).json({
            success: true,
            message: 'Admin role transferred successfully'
        });
    }catch(error){
        console.error('Transfer admin role error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

const getConversationByUserId = async (req, res) => {
    try {
        const conversation = await conversationService.getConvById(req.params.userId);
        console.log('Debug conversation:', conversation);
        return res.status(200).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Get conversation by user ID error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};
const getAllConvDepartment = async (req, res) => {
    try{
        const conversations = await conversationService.getAllConvDepartment();
        return res.status(200).json({
            success: true,
            data: conversations
        });
    }catch(error){
        console.error('Get all department conversations error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}

const getAllConvDepartmentById = async (req, res) => {
    try{
        const conversations = await conversationService.getAllConvDepartmentById(req.params.id);
        return res.status(200).json({
            success: true,
            data: conversations
        });
    }catch(error){
        console.error('Get all department conversations by ID error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
module.exports = {
    createConvDepartment,
    updateConvDepartment,
    deleteConvDepartment,
    createConvGroup,
    updateAllMembersChatPermission,
    assignDeputyAdmin,
    transferAdminRole,
    getConversationByUserId,
    getAllConvDepartment,
    getAllConvDepartmentById
};