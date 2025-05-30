const notificationController = require('../controllers/notificationController');

const express = require('express');
const router = express.Router();
const authentication = require('../middlewares/authentication');

router.get('/', authentication, notificationController.getAllNotifications);
router.get('/unread-count', authentication, notificationController.getUnreadCount);
router.put('/read-all', authentication, notificationController.markAllAsRead);
router.delete('/:notificationId', authentication, notificationController.deleteNotification);
router.delete('/', authentication, notificationController.deleteAllNotifications);

module.exports = router;    