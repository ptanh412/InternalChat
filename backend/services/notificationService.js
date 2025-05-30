const Notification = require('../models/Notifications');
const Users = require('../models/Users');


const getAllNotifications = async (userId, option = {}) => {
    const {limit = 20, skip = 0, sort = {createdAt: -1}} = option;
    try {
        const user = await Users.findById(userId).select('department');
        const userDepartments = user.department ? [user.department] : [];
        const notifications = await Notification.find(
            {
                type: { $ne: 'message' }, 
                $or: [
                    { received: userId },
                    {
                        departmentId: { $in: userDepartments },
                        excludeUsers: { $ne: userId }
                    }
                ]
            }
        )
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('sender', 'username avatar')
            .lean()

        const processNotifications = notifications.map(notification => {
            if (notification.received && notification.received.toString() === userId.toString()) {
                notification.isRead = true;
            }

            if (notification.departmentId && notification.readBy){
                const isReadByUser = notification.readBy.some(
                    readerId => readerId.toString() === userId.toString()
                );
                return {
                    ...notification,
                    isRead: isReadByUser,
                };
            }
            return notification;
        })
        // console.log('Notifications:', processNotifications);
        return processNotifications;
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        throw new Error('Failed to fetch notifications');
    }
}

const getNotificationCount = async (userId) => {
    try {
        const user = await Users.findById(userId).select('department');
        const userDepartments = user.department ? [user.department] : [];

        const personalCount = await Notification.countDocuments({
            received: userId,
            isRead: false
        })
        const departmentCount = await Notification.countDocuments({
            departmentId: { $in: userDepartments },
            excludeUsers: { $ne: userId },
            readBy: { $ne: userId }
        });
        return personalCount + departmentCount;
    } catch (error) {
        console.error('Error fetching notification count:', error.message);
        throw new Error('Failed to fetch notification count');
    }
}

const markAllAsRead = async (userId) => {
    try {
        await Notification.updateMany(
            {received: userId, isRead: false }, 
            { isRead: true }
        );

        const user = await Users.findById(userId).select('department');
        const userDepartments = user.department ? [user.department] : [];

         await Notification.updateMany(
            {
                departmentId: { $in: userDepartments },
                excludeUsers: { $ne: userId },
                readBy: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId }
            }
        )
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error.message);
        throw new Error('Failed to mark notification as read');
    }
}

const deleteNotification = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            received: userId
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        return true;
    }catch (error) {
        console.error('Error fetching notification:', error.message);
        throw new Error('Failed to fetch notification');
    }
}

const deleteAllNotifications = async (userId) => {
    const result = await Notification.deleteMany({ received: userId });
    return result;
}

module.exports = {
    getAllNotifications,
    getNotificationCount,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
}