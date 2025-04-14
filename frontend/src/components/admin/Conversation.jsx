import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Conversation = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

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
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200">
                    Create New Conversation
                </button>
            </div>
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

export default Conversation;