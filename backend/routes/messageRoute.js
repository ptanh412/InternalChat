const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authentication = require('../middlewares/authentication');
const {check} = require('express-validator');

router.get('/multimedia/all', authentication, messageController.getMultimediaMessages);
router.get('/:conversationId', authentication, messageController.getMessageByConv);
router.get('/:conversationId/recent', authentication, messageController.getRecentMessages);

module.exports = router;