const express = require('express');
const router = express.Router();

const conversationController = require('../controllers/conversationController');
const authentication = require('../middlewares/authentication');

router.post('/department', authentication, conversationController.createConvDepartment);
router.put('/department', authentication, conversationController.updateConvDepartment);
router.delete('/department/:id', authentication, conversationController.deleteConvDepartment);