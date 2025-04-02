const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authentication = require('../middlewares/authentication');
const {check} = require('express-validator');

router.get('/:conversationId', authentication, messageController.getMessageByConv);

module.exports = router;