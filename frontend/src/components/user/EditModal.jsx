import React, { useState, useCallback } from 'react';
import { CiEdit } from 'react-icons/ci';
import { useUser } from '../../context/UserContext';

const EditGroupModal = ({
    isOpen,
    onClose,
    initialName,
    currentChat,
    initialAvatar,
    isUploading,
    uploadFiles
}) => {    const { socket, user } = useUser();
    const [groupName, setGroupName] = useState(initialName || '');
    const [groupAvatar, setGroupAvatar] = useState('');
    const [avatarPreview, setAvatarPreview] = useState(initialAvatar || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNameChange = useCallback((e) => {
        setGroupName(e.target.value);
    }, []);    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupAvatar(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };    const submitGroupInfo = async () => {
        try {
            setIsSubmitting(true);
            let updateData = {};
            if (groupName !== currentChat.name) {
                updateData.name = groupName;
            }

            if (groupAvatar) {
                const uploadedUrl = await uploadFiles([groupAvatar]);
                if (uploadedUrl.length > 0) {
                    updateData.avatarGroup = uploadedUrl[0].fileUrl;
                }
            };
            
            if (Object.keys(updateData).length > 0) {
                socket.emit('group:update-info', {
                    conversationId: currentChat._id,
                    updatedBy: user,
                    updateData: updateData,
                    conversationType: currentChat.type
                });
            }
            
            // Đóng modal dù có thay đổi hay không
            onClose();
        } catch (err) {
            console.error('Error submitting group info:', err);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"></div>
            
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all w-full max-w-md animate-fade-up animate-once animate-duration-300">
                    {/* Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700">
                        <h3 className="text-xl font-semibold text-white flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Group Information
                        </h3>
                    </div>

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-slate-700">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-600 shadow-lg transition-transform group-hover:scale-105">
                                <img
                                    src={avatarPreview || 'https://via.placeholder.com/150'}
                                    alt="Group Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            <input
                                id="group-avatar"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                            
                            <label 
                                htmlFor="group-avatar" 
                                className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 cursor-pointer shadow-md transition-all transform hover:scale-110"
                            >
                                <CiEdit className="text-lg" />
                            </label>
                        </div>
                        
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-300 font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Click to change avatar
                        </p>
                    </div>

                    {/* Group Name Input */}
                    <div className="px-6 pt-6 pb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Group name
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={groupName}
                                onChange={handleNameChange}
                                className="block w-full rounded-lg py-3 pl-10 pr-3 border-gray-300 focus:border-purple-500 focus:ring-purple-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm transition-colors"
                                placeholder="Enter group name"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-600">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>                        <button
                            onClick={submitGroupInfo}
                            disabled={isUploading || isSubmitting}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {(isUploading || isSubmitting) ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Update Group
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditGroupModal;