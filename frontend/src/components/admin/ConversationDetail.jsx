import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import AddMemberModal from "../user/AddMemberModal";
import EditGroupModal from "../user/EditModal";

const ConversationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, socket } = useUser();
    // const [confirmDelete, setConfirmDelete] = useState(false);
    // const [actionMessage, setActionMessage] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    useEffect(() => {
        const handleChatUpdate = (update) => {
            if (update.type === 'update_members') {
                if (conversation && conversation._id === update.data.conversationId) {
                    setConversation(prev => ({
                        ...prev,
                        members: update.data.members
                    }));
                }
            }
            if (update.type === 'update_group_info') {
                if (conversation && conversation._id === update.data.conversationId) {
                    setConversation(prev => ({
                        ...prev,
                        name: update.data.name || prev.name,
                        avatarGroup: update.data.avatarGroup || prev.avatarGroup,
                    }));
                }
            }
        }
        socket.on('chat:update', handleChatUpdate);
        return () => {
            socket.off('chat:update', handleChatUpdate);
        }
    }, [socket, conversation]);
    const fetchConversationDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/conversation/department/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setConversation(response.data.data);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.error('Error fetching conversation details:', error.message);
            setError(error.message || 'Internal server error');
        }
    }

    useEffect(() => {
        fetchConversationDetails();
    }, [id]);

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-green-700';
            case 'user':
                return 'bg-blue-700';
            case 'guest':
                return 'bg-netral-500';
            default:
                return 'bg-netral-300';
        }
    }

    const handleShowAddMemberModal = () => {
        setShowAddMemberModal(!showAddMemberModal);
    }
    const handleAddMembers = async (selectedMembers) => {
        console.log('Selected members:', selectedMembers);
        if (!conversation || !selectedMembers) return;

        setLoading(true);

        try {
            socket.emit('group:add-member', {
                conversationId: conversation._id,
                conversationType: conversation.type,
                updatedBy: user,
                newMembers: selectedMembers.map(member => member._id)
            })
        } catch (error) {
            console.error('Error adding members:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleRemoveMemebers = (memberId) => {
        if (!conversation) return;
        setLoading(true);
        try {
            socket.emit('group:remove-member', {
                conversationId: conversation._id,
                conversationType: conversation.type,
                updatedBy: user,
                membersToRemove: [memberId]
            })
        } catch (error) {
            console.error('Error removing members:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleEditGroup = () => {
        setIsEditModalOpen(!isEditModalOpen);
    }
    const closeEditModal = () => {
        setIsEditModalOpen(false);
    }

    const uploadFiles = async (files) => {
        setLoading(true);
        const uploadedFiles = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('files', file);
                formData.append('conversationId', currentChat._id);

                setUploadProgress(prev => ({
                    ...prev,
                    [i]: 0
                }));

                const response = await axios.post('http://localhost:5000/api/file/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(prev => ({
                            ...prev,
                            [i]: percentCompleted
                        }));
                    }
                });

                const fileType = getFileType(file.type);

                const fileData = response.data.files[0];

                uploadedFiles.push({
                    fileName: file.name,
                    fileUrl: fileData.fileUrl,
                    fileType: fileType,
                    mimeType: file.type,
                    fileSize: file.size,
                    thumbnails: fileData.thumbnails || null
                })
            }
            return uploadedFiles;
        } catch (error) {
            console.error('Error uploading files:', error.response?.data || error.message || error.toString());
            return [];
        } finally {
            setLoading(false);
        }
    }


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }
    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 p-4 rounded-lg mb-6">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={fetchConversationDetails}
                        className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition duration-200"
                    >
                        Try Again
                    </button>
                </div>
                <div className="bg-red-100 p-4 rounded-lg mb-6">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={() => navigate('/conversation/department')}
                        className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition duration-200"
                    >
                        Back to Conversations
                    </button>
                </div>
            </div>
        )
    }
    if (!conversation) {
        return (
            <div className="p-6 text-center">
                <div className="bg-yellow-100 p-4 rounded-lg mb-6">
                    <p className="text-yellow-700">No conversation details found.</p>
                </div>
                <button
                    onClick={() => navigate('/conversation/department')}
                    className="mt-2 bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 transition duration-200"
                >
                    Back to Conversations
                </button>
            </div>
        )
    }
    const sortedMembers = [...(conversation.members || [])].sort((a, b) => {
        const rolePriority = { 'admin': 1, 'deputy_admin': 2, 'member': 3 };
        return rolePriority[a.role] - rolePriority[b.role];
    });
    
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/conversation')}
                        className="mr-4 text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg ">
                        {conversation.name.charAt(0) + conversation.name.charAt(1)}
                    </div>
                    <div className="ml-4">
                        <h1 className="text-2xl font-bold dark:text-white">
                            #{conversation.name || 'Unnamed Department Conversation'}
                        </h1>
                        <p className="text-gray-600">
                            Created: {new Date(conversation.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200 mr-2"
                        onClick={handleEditGroup}
                    >
                        Edit
                    </button>
                    {isEditModalOpen && (
                        <EditGroupModal
                            isOpen={isEditModalOpen}
                            onClose={closeEditModal}
                            currentChat={conversation}
                            initialName={conversation?.name}
                            initialAvatar={conversation?.avatarGroup}
                            isUploading={loading}
                            uploadFiles={uploadFiles}
                        />
                    )}
                    <button
                        onClick={handleShowAddMemberModal}
                        className="border border-blue-500 text-blue-500 px-4 py-2 rounded-lg hover:bg-blue-50 transition duration-200">
                        Add Members
                    </button>
                    {showAddMemberModal && (
                        <AddMemberModal
                            onClose={() => setShowAddMemberModal(false)}
                            onAddMembers={handleAddMembers}
                            currentMembers={conversation.members || []}
                        />
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 dark:bg-neutral-800">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">
                    Members ({conversation.memberCount || 0})
                </h2>

                {conversation.members && conversation.members.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-500">
                            <thead className="bg-gray-50 dark:bg-neutral-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-300">
                                        Member
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-300">
                                        Position
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-300">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-300">
                                        Joined
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-300">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-neutral-800 dark:divide-neutral-700">
                                {sortedMembers.map((member) => (
                                    <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img className="h-10 w-10 rounded-full" src={member.avatar} alt={member.name} />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {member.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {member.position}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full dark:text-white ${getRoleBadgeColor(member.role)}`}>
                                                {member.role === 'admin' ? 'Admin' :
                                                    member.role === 'deputy_admin' ? 'Deputy Admin' :
                                                        'Member'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap text-center text-sm font-medium flex items-center">
                                            {/* {confirmDelete && removingMemberId === member._id ? (
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => handleRemoveMember(member._id)}
                                                        className="text-red-600 hover:text-red-900 mr-2"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={cancelRemove}
                                                        className="text-gray-600 hover:text-gray-900"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : ( */}
                                            <button
                                                onClick={() => handleRemoveMemebers(member._id)}
                                                className="bg-red-600 hover:bg-red-900 text-white px-4 py-2 rounded-lg transition duration-200"
                                            >
                                                Remove
                                            </button>
                                            {/* )} */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No members in this conversation</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationDetail;