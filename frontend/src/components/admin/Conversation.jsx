import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useAlert } from '../../context/AlertContext'


const Conversation = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user, socket } = useUser();

    useEffect(() => {
        if (!socket) return;
        socket.on('group:created', (data) => {
            console.log("Group created", data);
            if (data.creatorId === user._id) {
                fetchConversations();
            }
        });
        return () => {
            socket.off('group:created');
        }
    }, [socket, user._id]);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/conversation/department', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setConversations(response.data.data);
            console.log(response.data.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            // setError(err.response.data.message);
            console.error(err);
        }
    }
    const handleConversationClick = (conversationId) => {
        navigate(`/conversation/department/${conversationId}`);
    }
    const randomColor = () => {
        const colors = [
            'bg-blue-700', 'bg-green-700', 'bg-purple-700',
            'bg-yellow-700', 'bg-pink-700', 'bg-indigo-700', 'bg-neutral-700'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
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
                        onClick={fetchConversations}
                        className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition duration-200"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-2xl font-bold dark:text-white">Department Conversations</h1>
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200"
                    onClick={() => setIsModalOpen(true)}
                >
                    Create New Conversation
                </button>
            </div>
            <CreateDeptConv
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                socket={socket}
            />
            {conversations.length === 0 ? (
                <div className="text-center p-10 bg-neutral-300 rounded-lg">
                    <p className="text-neutral-100">No department conversations found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation._id}
                            className={`${randomColor()} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition duration-200`}
                            onClick={() => handleConversationClick(conversation._id)}
                        >
                            <div className="flex items-center space-x-5 mb-4">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-80 text-purple-400 font-bold shadow-lg">
                                    {conversation.name.charAt(0) + conversation.name.charAt(1)}
                                </div>
                                <h2 className="text-xl font-bold text-white truncate">
                                    {conversation.name}
                                </h2>
                            </div>
                            <p className="text-white mb-2 text-sm">
                                Created: {new Date(conversation.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-2xl font-bold text-white mt-3">
                                {conversation.memberCount} members
                            </p>
                        </div>
                    ))}

                </div>
            )}
        </div>
    )
};

const CreateDeptConv = ({ isOpen, onClose, socket }) => {
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [conversationName, setConversationName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useUser();
    const { showAlert } = useAlert();
    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelectedDepartment(null);
            setConversationName("");
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedDepartment) {
            setConversationName(`${selectedDepartment.name} Group`);
        } else {
            setConversationName("");
        }
    }, [selectedDepartment]);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/department', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setDepartments(response.data.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.response.data.message);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDepartment) {
            setError("Please select a department");
            return;
        }
        try {
            setLoading(true);
            socket.emit('create:conversation-department', {
                departmentId: selectedDepartment._id,
                name: conversationName,
                creator: user._id,
            })
            setLoading(false);
            onClose();
            showAlert("Conversation created successfully", "success");
        } catch (err) {
            setError(err.message);
            setLoading(false);
            showAlert(err.message, "error");
        }
    }
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="dark:bg-neutral-800 bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-white">
                        Create Department Conversation
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-700 transition duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                            Select Department
                        </label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            value={selectedDepartment?._id || ""}
                            onChange={(e) => {
                                const dept = departments.find(dept => dept._id === e.target.value);
                                setSelectedDepartment(dept);
                            }}
                            required
                        >
                            <option value=''>Select a department</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                            Conversation Name
                        </label>
                        <input
                            type="text"
                            value={conversationName}
                            onChange={(e) => setConversationName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            required
                        />
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg mr-2 hover:bg-gray-400 transition duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4  bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-200 flex items-center"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Conversation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Conversation;