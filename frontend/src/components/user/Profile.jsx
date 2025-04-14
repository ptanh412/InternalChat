import { FaCamera, FaCheck, FaEdit, FaSpinner, FaTimes, FaUber } from "react-icons/fa";
import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../context/UserContext";
import axios from "axios";
import { useChatContext } from "../../context/ChatContext";

const Profile = React.memo(() => {
    const [isOpened, setIsOpened] = useState(true);
    const { user, setUser,socket } = useUser();
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
    const fileInputRef = useRef(null);
    const isUpdating = useRef(false);

    const updateUserData = (updatedFields) => {
        if (!updatedFields || !user) return user;
        try{
          
        }catch(error){
            console.error("Error updating user data", error);
        }
    }
    useEffect(() => {
        setFormData({
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber
        })
    }, [user]);

    useEffect(() => {
        if (socket) {

            socket.on('user:updated', (data) => {
                // updateUserData(data.updateFields);
                setIsSubmitting(false);
            })
            return () => {
                socket.off('user:updated');
            }
        }
    }, [socket]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (field) => {
        if (isSubmitting) return;

        if (formData[field] === user[field]) {
            setEditMode(prev => ({
                ...prev,
                [field]: false
            }))
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
            const userData = JSON.parse(localStorage.getItem("userData")) || user;

            const updatedUser = {
                ...userData,
                ...updateDataUser
            };
            localStorage.setItem("userData", JSON.stringify(updatedUser));
            setUser(updatedUser);
        }
    }
    const toggleEditMode = (field) => {
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
    }

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await axios.post("http://localhost:5000/api/file/upload-avatar", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (response.data.success) {
                updateUserData({ avatar: response.data.user.avatar });
            } else {
                alert("Error uploading avatar. Please try again.");
            }
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Error uploading avatar. Please try again.");
        } finally {
            setIsUploading(false);
        }
    }

    const renderEditableField = (label, field) => {
        return (
            <div className="flex items-center justify-between mt-2">
                <strong className="text-sm">{label}:</strong>
                <div className="flex items-center">
                    {editMode[field] ? (
                        <>
                            <input
                                type={field === 'email' ? 'email' : 'text'}
                                name={field}
                                value={formData[field]}
                                onChange={handleChange}
                                className="bg-neutral-600 rounded px-2 py-1 mr-2 text-white outline-none"
                                disabled={isSubmitting}
                            />
                            <button
                                onClick={() => handleSubmit(field)}
                                className="text-purple-400 mr-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <span className="animate-spin">...</span> : <FaCheck />}
                            </button>
                            <button
                                onClick={() => toggleEditMode(field)}
                                className="text-purple-400"
                                disabled={isSubmitting}
                            >
                                <FaTimes />
                            </button>
                        </>
                    ) : (
                        <>
                            <span className={field === 'email' ? 'text-blue-400' : ''}>
                                {user[field] || 'N/A'}
                            </span>
                            <button
                                onClick={() => toggleEditMode(field)}
                                className="text-purple-400 ml-2"
                            >
                                <FaEdit />
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full dark:bg-neutral-900 dark:text-white p-4">
            <h2 className="text-xl font-bold">Profile</h2>
            <div className="flex flex-col items-center mt-4">
                <div className="relative">
                    <img
                        src={user.avatar}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                    />
                    <div
                        className="absolute bottom-0 right-0 bg-neutral-500 rounded-full p-1 cursor-pointer text-xs"
                        onClick={handleAvatarClick}
                    >
                        {isUploading ? (
                            <FaSpinner className="animate-spin text-white" />
                        ) : (
                            <FaCamera className="text-white" />
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
                <h3 className="text-lg font-semibold mt-2">{user.name}</h3>
                <p className="text-green-400">{user.status === 'online' ? 'Active' : 'Offline'}</p>
            </div>

            <div className="p-4 mt-4 dark:bg-neutral-800 rounded-lg">
                <h3 className="text-lg font-semibold">About</h3>
                <p className="text-sm text-gray-400 mt-2">
                    "If several languages coalesce, the grammar of the resulting language is simpler."
                </p>
                <div className="mt-4 dark:bg-neutral-800 rounded-lg">
                    <button
                        onClick={() => setIsOpened(!isOpened)}
                        className="w-full text-base font-semibold dark:bg-neutral-800 p-2 rounded-lg flex justify-between"
                    >
                        <div className="flex items-center">
                            <FaUber className="mr-2" />
                            <span>Details</span>
                        </div>
                        <span>{isOpened ? "▲" : "▼"}</span>
                    </button>

                    {isOpened && (
                        <div className="mt-4 space-y-10 text-sm dark:bg-neutral-700 p-5 rounded-lg">
                            {renderEditableField('Name', 'name')}
                            {renderEditableField('Email', 'email')}
                            {renderEditableField('Phone Number', 'phoneNumber')}
                            <p><strong>Position:</strong> {user.position}</p>
                            <p><strong>Departmant:</strong> {user.department.name}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
})

export default Profile; 