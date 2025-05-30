const express = require('express');
const router = express.Router();

const conversationController = require('../controllers/conversationController');
const authentication = require('../middlewares/authentication');

router.post('/department', authentication, conversationController.createConvDepartment);
router.put('/department/:id', authentication, conversationController.updateConvDepartment);
router.delete('/department/:id', authentication, conversationController.deleteConvDepartment);
router.post('/group', authentication, conversationController.createConvGroup);
router.put('/update-group', authentication, conversationController.updateAllMembersChatPermission);
router.post('/assign-deputy', authentication, conversationController.assignDeputyAdmin);
router.post('/transfer-admin', authentication, conversationController.transferAdminRole);
router.get('/user/:userId', authentication, conversationController.getConversationByUserId);
router.get('/department', authentication, conversationController.getAllConvDepartment);
router.get('/department/:id', authentication, conversationController.getAllConvDepartmentById);
router.post('/archive', authentication, conversationController.archiveConversation);

module.exports = router;