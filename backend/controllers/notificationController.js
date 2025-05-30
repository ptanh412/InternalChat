const notificationService = require('../services/notificationService');

const getAllNotifications = async (req, res) => {
    try {
        const { skip, limit } = req.query;

        const option = {
            limit: parseInt(limit) || 10,
            page: parseInt(skip) || 0
        }
        const userId = req.user._id;
        const notifications = await notificationService.getAllNotifications(userId, option);
        const unreadCount = await notificationService.getNotificationCount(userId);
        return res.status(200).json({
            success: true,
            message: 'Notifications fetched successfully',
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch notifications'
        });
    }
}

const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const unreadCount = await notificationService.getNotificationCount(userId);
        return res.status(200).json({
            success: true,
            message: 'Unread count fetched successfully',
            data: unreadCount
        });
    } catch (error) {
        console.error('Error fetching unread count:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch unread count'
        });
    }
}

const markAllAsRead = async (req, res) => {
    try {
        console.log('Marking all notifications as read...');
        const userId = req.user._id;
        const notification = await notificationService.markAllAsRead(userId);
        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark all notifications as read'
        });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;
        await notificationService.deleteNotification(notificationId, userId);
        return res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting notification:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notification'
        });
    }
}

const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        await notificationService.deleteAllNotifications(userId);
        return res.status(200).json({
            success: true,
            message: 'All notifications deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting all notifications:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete all notifications'
        });
    }
};

module.exports = {
    getAllNotifications,
    getUnreadCount,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
}