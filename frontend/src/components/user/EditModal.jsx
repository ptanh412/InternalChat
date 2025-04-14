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
}) => {
    const { socket, user } = useUser();
    const [groupName, setGroupName] = useState(initialName || '');
    const [groupAvatar, setGroupAvatar] = useState('');
    const [avatarPreview, setAvatarPreview] = useState(initialAvatar || '');

    const handleNameChange = useCallback((e) => {
        setGroupName(e.target.value);
    }, []);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupAvatar(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    }

    const submitGroupInfo = async () => {
        try {
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
                onClose();
            }
        } catch (err) {
            console.error('Error submitting group info:', err);
        }
    }

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? 'block' : 'hidden'}`}>
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-md">
                <h3 className="text-xl font-semibold mb-4 dark:text-white">
                    Edit Group Information
                </h3>
                <div className="mb-4 flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-2">
                        <img
                            src={avatarPreview || 'https://via.placeholder.com/150'}
                            alt="Group Avatar"
                            className="w-full h-full rounded-full object-cover"
                        />
                        <input
                            id="group-avatar"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                        <label htmlFor="group-avatar" className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 cursor-pointer">
                            <CiEdit className="text-white" />
                        </label>
                    </div>
                    <p className="text-sm text-neutral-500">Click to change avatar</p>
                </div>
                {/* Group Name Input */}

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 dark:text-white">Group name</label>
                    <input
                        type="text"
                        value={groupName}
                        onChange={handleNameChange}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600 mr-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submitGroupInfo}
                        disabled={isUploading}
                        className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                            </>
                        ) : 'Update Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditGroupModal;