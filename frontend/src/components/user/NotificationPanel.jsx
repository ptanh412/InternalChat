import { useState, useEffect } from 'react';
import { IoMdNotificationsOff } from 'react-icons/io';
import { BsCheck2All } from 'react-icons/bs';
import { RiDeleteBin6Line } from 'react-icons/ri';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import { useNotification } from '../../context/NotificationContext';

const NotificationPanel = ({ isOpen }) => {
  const { 
    notifications, 
    loading, 
    error, 
    markAllAsRead,
    deleteNotification 
  } = useNotification();
  
  const { user } = useUser();


  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderContentNotification = (notification) => {
    const { metadata, type } = notification;

    if (!metadata) {
      return notification.content || "System notification"; // Fallback text if metadata is not present
    };
    // console.log('Notification metadata:', metadata);

    const { departmentName, oldPosition, newPosition, oldDepartment, newDepartment } = metadata;
    const currentUserId = user._id;

    switch (type) {
      case 'system_position_change':
        if (currentUserId === newPosition?._id) {
          return `Admin has changed your position to ${newPosition?.position}`;
        } else {
          return `${newPosition?.name} is the new ${newPosition?.position} of ${departmentName}`;
        }
      case 'system_member_joined':
        if (currentUserId === newPosition?._id){
          return `Admin has changed your position to ${newPosition?.position} and moved you to ${newDepartment?.name}`;
        }else {
          return `${newPosition?.name} is the new ${newPosition?.position} of ${newDepartment?.name}`;
        }
      case 'system_member_removed':
        if (currentUserId === oldPosition?._id) {
          return `You have been removed from ${oldDepartment?.name} department`;
        } else {
          return `Admin removed ${oldPosition?.name} from ${oldDepartment?.name}`;
        }
      default:
        return notification.content || "System notification"; // Fallback text if type is not recognized
    }

    // // Check for position change within same department
    // if (departmentName) {
    //   if (user._id === oldPosition?._id) {
    //     return `Admin has changed your position to ${newPosition?.position}`;
    //   }
    //   if (user._id !== oldPosition?._id) {
    //     return `${oldPosition?.name} has changed position to ${newPosition?.position}`;
    //   }
    // }

    // // Check for department changes
    // if (newDepartment && oldDepartment) {
    //   if (user._id === oldPosition?._id) {
    //     return `Admin has changed your position to ${newPosition?.position} and moved you to ${newDepartment.name} department`;
    //   }
    //   if (user._id !== oldPosition?._id && user._id !== newPosition?._id) {
    //     return `${newPosition?.name} is the new ${newPosition?.position} of ${newDepartment.name} department`;
    //   }
    //   if (user._id !== newPosition?._id) {
    //     return `Admin removed ${oldPosition?.name} from ${oldDepartment.name} department`;
    //   }
    // }

    // // Handle just new department, no old department
    // if (newDepartment && !oldDepartment) {
    //   if (user._id === newPosition?._id) {
    //     return `You have joined ${newDepartment.name} department`;
    //   }
    //   return `${newPosition?.name} joined ${newDepartment.name} department`;
    // }

    // // Handle just old department, no new department
    // if (!newDepartment && oldDepartment) {
    //   if (user._id === oldPosition?._id) {
    //     return `You have been removed from ${oldDepartment.name} department`;
    //   }
    //   return `${oldPosition?.name} has been removed from ${oldDepartment.name} department`;
    // }

    // // Default fallback
    // return metadata.content || "System notification";
  };

  return (
    <div
      // ref={notificationRef}
      className="absolute w-64 bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-2 overflow-hidden left-0 top-1 z-[9999]"
    >
      <div className="flex justify-between items-center mb-2 border-b pb-2 dark:border-neutral-700">
        <h3 className="font-medium text-gray-800 dark:text-white">Notifications</h3>
        <div className="flex space-x-2">
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            title="Mark all as read"
          >
            <BsCheck2All className="text-lg" />
          </button>
          <button
            // onClick={deleteAllNotifications}
            className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            title="Delete all"
          >
            <RiDeleteBin6Line className="text-lg" />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="py-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="py-4 text-center text-red-500 dark:text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
            <IoMdNotificationsOff className="text-3xl mb-2" />
            <p>No notifications</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => (
               <li
               key={notification?._id}
               className={`p-2 border-b last:border-0 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 relative ${!notification?.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
             >
                <div className="flex items-start">
                  <img
                    src={notification?.sender?.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">{notification?.sender?.username}</span>{' '}
                      {notification?.metadata ? (
                        renderContentNotification(notification)
                      ) : (
                        notification?.content
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimeAgo(notification?.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNotification(notification?._id)}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 ml-1"
                  >
                    <RiDeleteBin6Line />
                  </button>
                </div>
                {!notification?.isRead && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;