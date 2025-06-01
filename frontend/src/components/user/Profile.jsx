import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "../../context/UserContext";
import axios from "axios";
import { useAlert } from '../../context/AlertContext';

const Profile = () => {
    const { showAlert } = useAlert();
    const [isOpened, setIsOpened] = useState(true);
    const { user, setUser, socket } = useUser();
    const [editMode, setEditMode] = useState({
        name: false,
        email: false,
        phoneNumber: false
    });
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);    const updateUserData = (updatedFields) => {
        if (!updatedFields || !user) return user;
        try {
            // Get current user data from localStorage
            const userData = JSON.parse(localStorage.getItem("userData")) || user;
            
            // Merge updated fields with existing user data
            const updatedUser = {
                ...userData,
                ...updatedFields
            };
            
            // Update localStorage
            localStorage.setItem("userData", JSON.stringify(updatedUser));
            
            // Update user context
            setUser(updatedUser);
            
            return updatedUser;
        } catch (error) {
            console.error("Error updating user data", error);
            return user;        }
    }

    useEffect(() => {
        // Only update form data when user changes AND we're not in edit mode
        const hasEditModeActive = Object.values(editMode).some(mode => mode);
        
        if (!hasEditModeActive) {
            setFormData({
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber
            });
        }
    }, [user, editMode]);    useEffect(() => {
        if (socket) {
            socket.on('user:updated', (data) => {
                // Only handle if it's for the current user and we're submitting
                if (data && data.userId === user._id && isSubmitting) {
                    setIsSubmitting(false);
                    showAlert("User data updated successfully", "success");
                }
            });

            return () => {
                socket.off('user:updated');
            }
        }
    }, [socket, showAlert, user._id, isSubmitting]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };    const handleSubmit = useCallback((field) => {
        if (isSubmitting) return;

        if (formData[field] === user[field]) {
            setEditMode(prev => ({
                ...prev,
                [field]: false
            }));
            return;
        }

        setIsSubmitting(true);
        setEditMode(prev => ({
            ...prev,
            [field]: false
        }));

        if (socket) {
            const updateDataUser = {
                [field]: formData[field]
            };
            socket.emit('user:update', {
                userId: user._id,
                updateData: updateDataUser
            });

            // Update localStorage immediately but delay context update
            const userData = JSON.parse(localStorage.getItem("userData")) || user;
            const updatedUser = {
                ...userData,
                ...updateDataUser
            };

            localStorage.setItem("userData", JSON.stringify(updatedUser));
            
            // Delay the context update to prevent immediate re-render
            setTimeout(() => {
                setUser(updatedUser);
            }, 100);
        }
    }, [isSubmitting, formData, user, socket, setUser]);    const toggleEditMode = useCallback((field) => {
        if (!editMode[field]) {
            setFormData((prev) => ({
                ...prev,
                [field]: user[field] || ''
            }));
        }

        setEditMode((prev) => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, [editMode, user]);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showAlert("File size exceeds 5MB limit.", "error");
            return;
        }

        if (!file.type.startsWith("image/")) {
            showAlert("Please upload an image file.", "error");
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await axios.post(
                "http://localhost:5000/api/file/upload-avatar",
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data.success) {
                // Update user data in localStorage and context immediately
                const updatedUser = updateUserData({ avatar: response.data.user.avatar });
                
                // Also emit socket event to update other clients if needed
                if (socket) {
                    socket.emit('user:update', {
                        userId: user._id,
                        updateData: { avatar: response.data.user.avatar }
                    });
                }
                
                showAlert("Avatar uploaded successfully", "success");
            } else {
                showAlert("Error uploading avatar. Please try again.", "error");
            }
        } catch (error) {
            showAlert("Error uploading avatar. Please try again", "error");
            console.error("Error uploading avatar:", error);
        } finally {
            setIsUploading(false);
            // Clear the file input to allow re-uploading the same file
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    const renderEditableField = (label, field) => {
        // Function to cancel edit mode and restore original value
        const cancelEdit = () => {
            setFormData(prev => ({
                ...prev,
                [field]: user[field] || ''
            }));
            setEditMode(prev => ({
                ...prev,
                [field]: false
            }));
        };

        return (
            <div className="flex flex-col lg:flex-row lg:items-center py-3 border-b border-gray-700">
                <label className="font-medium text-gray-300 mb-1 lg:mb-0 lg:w-1/4 text-sm mr-5">{label}:</label>
                <div className="flex items-center w-full lg:w-3/4 mt-1 lg:mt-0">
                    {editMode[field] ? (
                        <div className=" sm:flex-row w-full items-start sm:items-center space-y-3">
                            <input
                                type={field === 'email' ? 'email' : 'text'}
                                name={field}
                                value={formData[field]}
                                onChange={handleChange}
                                className="bg-gray-700 rounded px-3 py-2 text-white outline-none border border-gray-600 focus:border-indigo-500 transition w-full sm:w-auto max-w-full truncate"
                                disabled={isSubmitting}
                            />
                            <div className="flex items-center sm:mt-0 sm:ml-2">
                                <div className="flex mt-2 sm:mt-0 sm:ml-2">
                                    <button
                                        onClick={() => handleSubmit(field)}
                                        className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 flex items-center mr-2 transition duration-200"
                                        disabled={isSubmitting}
                                        aria-label="Save"
                                    >
                                        {isSubmitting ? (
                                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        <span className="text-sm">Save</span>
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 flex items-center transition duration-200"
                                        disabled={isSubmitting}
                                        aria-label="Cancel"
                                    >
                                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm">Cancel</span>
                                    </button>
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="flex items-end w-full justify-between">
                            <span className={`${field === 'email' ? 'text-indigo-400' : 'text-white'} truncate max-w-md`} title={user[field]}>
                                {user[field] || 'N/A'}
                            </span>
                            <button
                                onClick={() => toggleEditMode(field)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded ml-3 px-3 py-1 flex items-center transition duration-200"
                                aria-label="Edit"
                            >
                                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                <span className="text-sm">Edit</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <div className="relative">
                            <span className="bg-gradient-to-r from-blue-500 to-purple-600 w-3 h-8 rounded-full inline-block shadow-lg"></span>
                            <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 w-3 h-8 rounded-full inline-block animate-pulse opacity-75"></span>
                        </div>
                        User Profile
                    </h1>
                </div>
                {/* Profile Header */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    <div className="px-6 pb-6">
                        <div className="flex flex-col items-center sm:flex-row sm:items-end -mt-16 mb-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full border-4 border-gray-800 overflow-hidden bg-gray-700">
                                    <img
                                        src={user.avatar || "/api/placeholder/150/150"}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div
                                    onClick={handleAvatarClick}
                                    className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300"
                                >
                                    {isUploading ? (
                                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    ref={fileInputRef}
                                    className="hidden"
                                />
                            </div>
                            <div className="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left">
                                <h3 className="text-xl font-bold">{user.name}</h3>
                                <div className="flex items-center justify-center sm:justify-start mt-1">
                                    <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'} mr-2`}></div>
                                    <span className="text-sm text-gray-300">{user.status === 'online' ? 'Active Now' : 'Offline'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-indigo-400 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            About
                        </h3>
                        <p className="text-gray-300 mt-3 italic">
                            "If several languages coalesce, the grammar of the resulting language is simpler."
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <button
                        onClick={() => setIsOpened(!isOpened)}
                        className="w-full flex items-center justify-between p-6 focus:outline-none transition"
                    >
                        <div className="flex items-center text-indigo-400 font-semibold">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Personal Information
                        </div>
                        <svg
                            className={`w-5 h-5 transition-transform duration-300 ${isOpened ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isOpened && (
                        <div className="p-6 bg-gray-700 rounded-b-xl border-t border-gray-600">
                            {renderEditableField('Name', 'name')}
                            {renderEditableField('Email', 'email')}
                            {renderEditableField('Phone Number', 'phoneNumber')}

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-gray-700">
                                <span className="font-medium text-gray-300">Position:</span>
                                <span className="mt-1 sm:mt-0 text-white">{user.position || 'N/A'}</span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3">
                                <span className="font-medium text-gray-300">Department:</span>
                                <span className="mt-1 sm:mt-0 text-white">{user.department?.name || 'N/A'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;