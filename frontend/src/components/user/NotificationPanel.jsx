import { useState, useEffect } from 'react';
import { IoMdNotificationsOff } from 'react-icons/io';
import { BsCheck2All } from 'react-icons/bs';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { HiStar, HiUser, HiOfficeBuilding, HiShieldCheck } from 'react-icons/hi';
import { BsBellFill } from 'react-icons/bs';
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system_position_change':
        return <HiStar className="w-4 h-4 text-amber-500" />;
      case 'system_member_joined':
        return <HiUser className="w-4 h-4 text-green-500" />;
      case 'system_member_removed':
        return <HiOfficeBuilding className="w-4 h-4 text-red-500" />;
      default:
        return <HiShieldCheck className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationBadgeColor = (type) => {
    switch (type) {
      case 'system_position_change':
        return 'bg-gradient-to-r from-amber-400 to-orange-500';
      case 'system_member_joined':
        return 'bg-gradient-to-r from-green-400 to-emerald-500';
      case 'system_member_removed':
        return 'bg-gradient-to-r from-red-400 to-rose-500';
      default:
        return 'bg-gradient-to-r from-blue-400 to-indigo-500';
    }
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
    <div className="absolute w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden left-0 top-1 z-[9999] border border-gray-200/50 dark:border-neutral-700/50">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BsBellFill className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-white text-lg">Notifications</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={markAllAsRead}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 transform hover:scale-105 backdrop-blur-sm"
              title="Mark all as read"
            >
              <BsCheck2All className="w-4 h-4 text-white" />
            </button>
            <button
              // onClick={deleteAllNotifications}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 transform hover:scale-105 backdrop-blur-sm"
              title="Delete all"
            >
              <RiDeleteBin6Line className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center space-x-2 text-red-500 dark:text-red-400">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span>{error}</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-4">
              <IoMdNotificationsOff className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification, index) => (
              <div
                key={notification?._id}
                className={`group relative mb-2 last:mb-0 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                  !notification?.isRead 
                    ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-md' 
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-gray-50/80 dark:hover:bg-neutral-700/80'
                } backdrop-blur-sm border border-gray-200/30 dark:border-neutral-700/30 hover:border-gray-300/50 dark:hover:border-neutral-600/50 hover:shadow-lg`}
              >
                {/* Notification indicator */}
                {!notification?.isRead && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg animate-pulse"></div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Avatar with status indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white dark:ring-neutral-800 shadow-md">
                        <img
                          src={notification?.sender?.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Notification type badge */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${getNotificationBadgeColor(notification?.type)} shadow-lg flex items-center justify-center`}>
                        {getNotificationIcon(notification?.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {notification?.sender?.username}
                            </span>{' '}
                            <span className="text-gray-700 dark:text-gray-300">
                              {notification?.metadata ? (
                                renderContentNotification(notification)
                              ) : (
                                notification?.content
                              )}
                            </span>
                          </p>
                          
                          {/* Timestamp with better styling */}
                          <div className="flex items-center mt-2 space-x-2">
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {formatTimeAgo(notification?.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Delete button with enhanced styling */}
                        <button
                          onClick={() => deleteNotification(notification?._id)}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-all duration-200 transform hover:scale-110 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete notification"
                        >
                          <RiDeleteBin6Line className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;