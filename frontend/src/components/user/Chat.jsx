import ConversationList from "./ConversationList";
import Groups from "./Groups";
import Contacts from "./Contacts";
import Profile from "./Profile";
import { MdAttachFile, MdClose, MdEmojiEmotions, MdOutlineEmojiEmotions, MdSend } from "react-icons/md";
import { FaDownload, FaEllipsisV, FaInfoCircle, FaReply, FaTrash } from "react-icons/fa";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { BsSearch } from "react-icons/bs";
import axios from "axios";
import { useUser } from "../../context/UserContext";

const Chat = React.memo(({ currentComponent }) => {
    const [headerColor, setHeaderColor] = useState(null);
    const [showInfo, setShowInFo] = useState(false);
    const [showRecall, setShowRecall] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [activeReaction, setActiveReaction] = useState(null);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showDetailReaction, setShowDetailReaction] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [temporaryMessages, setTemporaryMessages] = useState([]);
    const { user, socket } = useUser();
    const messagesEndRef = useRef(null);

    console.log('Curent Chat', currentChat);

    const getRandomColor = useCallback(() => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }, []);
    useEffect(() => {
        if (currentChat && (currentChat.type === 'group' || currentChat.type === 'department')) {
            // Generate the color only when the currentChat changes to a group/department
            setHeaderColor(getRandomColor());
        } else {
            setHeaderColor(null); // Reset if it's a private chat (you handle color differently there)
        }
    }, [currentChat, getRandomColor]);

    const handleClickOutside = useCallback((event) => {
        const isClickInsideOption = Array.from(document.querySelectorAll(".option-menu")).some(menu => menu.contains(event.target));
        const isClickInsideReaction = Array.from(document.querySelectorAll(".reaction-menu")).some(menu => menu.contains(event.target));

        if (!isClickInsideOption && !isClickInsideReaction) {
            setActiveReaction(null);
            setActiveMessageId(null);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [handleClickOutside]);

    const toggleOptionMenu = useCallback((messageId, e) => {
        e.stopPropagation();
        setActiveMessageId(activeMessageId === messageId ? null : messageId);
    }, [])

    const toggleReaction = useCallback((messageId, e) => {
        e.stopPropagation();
        setActiveReaction(activeReaction === messageId ? null : messageId);
    }, [])
    const ComponentToRender = useMemo(() => {
        switch (currentComponent) {
            case 'Groups':
                return Groups;
            case 'Contacts':
                return () => <Contacts setCurrentChat={setCurrentChat} />;
            case 'Profile':
                return Profile;
            default:
                return () => <ConversationList setCurrentChat={setCurrentChat} />;
        }
    }, [currentComponent, setCurrentChat]);


    const handleShowInfo = () => {
        setShowInFo(!showInfo);
    };

    const REACTIONS = [
        { emoji: '❤️', name: 'heart' },
        { emoji: '👍', name: 'like' },
        { emoji: '😮', name: 'wow' },
        { emoji: '😠', name: 'angry' },
        { emoji: '😢', name: 'cry' }
    ];
    

    useEffect(() => {
        if (socket) {
            const handleDisconnect = () => {
                if (currentChat) {
                    socket.emit('conversation:leave', {
                        conversationId: currentChat._id
                    });
                }
            };

            socket.on('disconnect', handleDisconnect);

            return () => {
                socket.off('disconnect', handleDisconnect);
            };
        }
    }, [socket, currentChat]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentChat && currentChat.isTemporary) {
                socket.emit('conversation:leave', {
                    conversationId: currentChat._id,
                })
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            if (currentChat && currentChat.isTemporary) {
                socket.emit('conversation:leave', {
                    conversationId: currentChat._id,
                })
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [currentChat, socket])

    useEffect(() => {
        socket.on('chat:loadded', (data) => {
            console.log('Chat component loaded:', data);
            if (data && data.conversationId) {
                setCurrentChat({
                    ...data.conversation,
                    isTemporary: false
                })
            }
        })
        socket.on('chat:created', (data) => {
            // console.log('Chat created:', data);
            setCurrentChat(prev => ({
                ...data.newConversation,
                isTemporary: false
            }));

            if (temporaryMessages.length > 0) {
                const updatedTempMessages = temporaryMessages.map(msg => ({
                    ...msg,
                    conversationId: data.newConversation._id
                }));
                setTemporaryMessages(updatedTempMessages);
            }
        });
        socket.on('message:new', (data) => {
            console.log('New message:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => {
                    const isMessageExists = prev.some(msg => msg._id === data.message._id);
                    return isMessageExists
                        ? prev
                        : [...prev, data.message];
                });
            }
        });

        socket.on('conversation:update', (data) => {
            console.log('Conversation updated:', data);
            if (currentChat && currentChat._id === data.conversationId) {
               setMessages(prev => {
                    return prev.map(msg => {
                        if (msg._id === data.lastMessage._id) {
                            return {
                                ...msg,
                                ...data.lastMessage
                            }
                        }
                        return msg;
                    })
                });
            }
        })
        socket.on('user:entered', (data) => {
            console.log('user entered the conversation:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg.status !== 'read' && msg.sender._id !== user._id) {
                            return {
                                ...msg,
                                status: 'read',
                                readBy: data.readBy || []
                            }
                        };
                        return msg;
                    })
                );
                setCurrentChat(prev => {
                    if (prev && prev.lastMessage) {
                        return {
                            ...prev,
                            lastMessage: {
                                ...prev.lastMessage,
                                status: 'read',
                                // readBy: data.readBy || []
                            }
                        }
                    }
                    return prev;
                })
            }
        })

        socket.on('conversation:read', (data) => {
            console.log('Conversation read:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                if (currentChat.type === 'group' || currentChat.type === 'department') {
                    setMessages(prev =>
                        prev.map(msg => {
                            if (msg.status !== 'read') {
                                return {
                                    ...msg,
                                    status: 'read',
                                    readBy: data.readBy || []
                                }
                            };
                            return msg;
                        })
                    );
                    setCurrentChat(prev => {
                        if (prev && prev.lastMessage) {
                            return {
                                ...prev,
                                lastMessage: {
                                    ...prev.lastMessage,
                                    status: 'read',
                                    readBy: data.readBy || []
                                }
                            }
                        }
                        return prev;
                    })
                }
            }
        })

        socket.on('message:react-success', (data) => {
            console.log('Message reacted:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.messageId) {
                        return {
                            ...msg,
                            reactions: data.reactions
                        }
                    }
                    return msg;
                }))
            }
        });

        socket.on('message:reply-success', (data) => {
            console.log('Message replied:', data);
            // if (currentChat && currentChat._id === data.conversationId) {
            //     setMessages(prev => {
            //         const messageExists = prev.some(m => m._id === data.messageId);
            //         if (!messageExists) {
            //             const newReplyMessage = {
            //                 _id: data.messageId,
            //                 content: data.content,
            //                 sender: data.sender,
            //                 conversationId: data.conversationId,
            //                 replyTo: data.replyTo,
            //                 createdAt: new Date().toISOString(),
            //                 status: data.status || 'sent',
            //                 reactions: []
            //             };
            //             return [...prev, newReplyMessage];
            //         }
            //         return prev;
            //     });
            // }
        })

        return () => {
            socket.off('chat:created');
            socket.off('message:new');
            socket.off('chat:loadded');
            socket.off('conversation:read');
            socket.off('message:react-success');
            socket.off('message:reply-success');
        }
    }, [socket, currentChat, temporaryMessages]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (currentChat && !currentChat.isTemporary) {
                setLoading(true);
                try {
                    const response = await axios.get(`http://localhost:5000/api/message/${currentChat._id}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.data.success) {
                        setMessages(response.data.data);
                    } else {
                        console.log('Error fetching messages:', response.data.message);
                        setMessages([]);
                    }
                } catch (error) {
                    console.log(error);
                    setMessages([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setMessages([]);
            }
        };
        fetchMessages();
    }, [currentChat]);

    const sendMessage = useCallback((e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        try {
            const tempId = `temp_${Date.now()}`;

            // If replying to a message
            if (replyingTo) {
                socket.emit('reply:message', {
                    messageId: replyingTo._id,
                    content: inputMessage,
                    tempId: tempId
                });
            } else {
                // Normal message
                const messagePayload = {
                    conversationId: currentChat._id,
                    content: inputMessage,
                    attachments: [],
                    replyTo: null,
                    type: 'text',
                    tempId: tempId
                };
                socket.emit('send:message', messagePayload);
            }

            setReplyingTo(null);
            setInputMessage('');
        } catch (error) {
            console.error('Error sending message', error);
        }
    }, [inputMessage, currentChat, socket, replyingTo]);
    const handleReply = useCallback((message) => {
        setReplyingTo(message);
    }, []);

    const cancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

    const allMessages = [...messages, ...temporaryMessages]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const getReactionMap = useCallback((reactions) => {
        if (!reactions || reactions.length === 0) return {};

        return reactions.reduce((acc, reaction) => {
            const emoji = reaction.emoji;
            if (!acc[emoji]) {
                acc[emoji] = {
                    count: 0,
                    users: []
                };
            }
            acc[emoji].count += 1;

            const userId = typeof reaction.user === 'object' ? reaction.user._id : reaction.user;
            if (!acc[emoji].users.includes(userId)) {
                acc[emoji].users.push(userId);
            }
            return acc;
        }, {});
    }, []);

    const getUserReactions = useCallback((reactions) => {
        if (!reactions || !reactions.length) return [];

        return reactions.reduce((acc, reaction) => {
            const userId = typeof reaction.user === 'object' ? reaction.user._id : reaction.user;
            const userObj = typeof reaction.user === 'object' ? reaction.user : { _id: reaction.user, name: 'Unknown', avatar: '' };

            if (acc.some(item => item.user._id === userId)) {
                return acc;
            }

            const userReactions = reactions.filter(r => {
                const rUserid = typeof r.user === 'object' ? r.user._id : r.user;
                return rUserid === userId;
            });

            acc.push({
                user: userObj,
                reactions: userReactions.map(r => r.emoji)
            });

            return acc;
        }, []);
    }, []);

    // Tính toán reactionsMap cho tất cả các tin nhắn một lúc
    const allReactionsMaps = useMemo(() => {
        return allMessages.reduce((maps, msg) => {
            maps[msg._id] = getReactionMap(msg.reactions);
            return maps;
        }, {});
    }, [allMessages, getReactionMap]);

    const handleReaction = useCallback((messageId, emoji) => {
        socket.emit('message:reaction', {
            messageId,
            emoji
        });
        setActiveReaction(null);
        setShowEmoji(false);
    }, [socket]);

    const handleRemoveReaction = useCallback((messageId, emoji) => {
        socket.emit('message:remove-reaction', {
            messageId,
            emoji
        });
        setActiveReaction(null);
        setShowDetailReaction(false);
    }, [socket]);

    const handleShowDetailReaction = useCallback((messageId) => {
        setShowDetailReaction(messageId);
    }, []);


    const renderChatHeader = () => {
        if (!currentChat) return null;

        if (currentChat.type === 'private') {
            const contactUser = currentChat.members?.find(member => member._id !== user._id);
            return (
                <div className="flex items-center p-4 relative">
                    {contactUser?.avatar ? (
                        <img
                            src={contactUser?.avatar}
                            alt="User"
                            className="w-10 h-10 rounded-full"
                        />
                    ) : (
                        <div
                            className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold shadow-lg"
                            style={{ backgroundColor: getRandomColor() }}
                        >
                            {contactUser?.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="ml-3">
                        <h2 className="text-lg font-semibold">
                            {contactUser?.name}
                        </h2>
                        <h3 className="text-xs text-neutral-400">
                            {contactUser.position} - {contactUser.department.name}
                        </h3>
                    </div>
                    <div className={`w-2 h-2 ${contactUser?.status === 'online' ? 'bg-green-500' : 'bg-gray-500'} rounded-full absolute left-12 top-12`}></div>
                </div>
            )
        }

        if (currentChat.type === 'group' || currentChat.type === 'department') {
            return (
                <div className="flex items-center p-4 relative">
                    <div
                        className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold shadow-lg"
                        style={{ backgroundColor: headerColor }}
                    >
                        {currentChat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                        <h2 className="text-lg font-semibold">
                            {currentChat.type === 'department' ? `#${currentChat.name}` : currentChat.name}
                        </h2>
                        <h3 className="text-xs text-neutral-400">
                            {currentChat.members?.length} members
                        </h3>
                    </div>
                </div>
            )
        }
    }

    const renderInfoSidebar = () => {
        if (!currentChat) return null;

        if (currentChat.type === 'private') {
            const contactUser = currentChat.members?.find(member => member._id !== user._id);

            return (
                <div className="w-[350px] bg-neutral-900 text-white  shadow-lg p-4">
                    {/* Profile Section */}
                    <div className="relative">
                        <img
                            src={contactUser?.avatar}
                            alt="User"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full">
                            <FaEllipsisV className="text-white" />
                        </button>
                        <div className="mt-3 ml-3 text-left absolute bottom-2 w-full">
                            <h3 className="text-base font-semibold">
                                {contactUser?.name}
                            </h3>
                            <p className={`${contactUser?.status === 'online'
                                ? 'text-green-400'
                                : 'text-gray-400'
                                }`}>
                                {contactUser?.status === 'online'
                                    ? '● Active'
                                    : '○ Offline'}
                            </p>
                        </div>
                    </div>
                    {/* User Details */}
                    <div className="mt-4 border-t border-gray-700 py-5">
                        <h4 className="text-xs text-gray-400">CONTACT INFORMATION</h4>
                        <div className="space-y-2 mt-2">
                            <p><strong>Email:</strong> {contactUser?.email}</p>
                            <p><strong>Department:</strong> {contactUser?.department?.name}</p>
                            <p><strong>Position:</strong> {contactUser?.position}</p>
                        </div>
                    </div>

                    {/* Group in Common */}
                    <div className="py-5 border-t border-gray-700">
                        <h4 className="text-xs text-gray-400">GROUPS IN COMMON</h4>
                        <div className="space-y-2 mt-2">
                            {contactUser?.commonGroups?.map((group, index) => (
                                <p key={index} className="text-white font-semibold">
                                    # {group.name}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="py-5 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs text-gray-400">SHARED MEDIA</h4>
                            <button className="text-green-400 text-xs">Show all</button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {/* Placeholder for shared media
                            {[1, 2, 3].map((_, index) => (
                                <img
                                    key={index}
                                    src="/api/placeholder/80/80"
                                    alt="Media"
                                    className="w-16 h-16 rounded-lg"
                                />
                            ))} */}
                            <div className="w-16 h-16 bg-gray-700 flex items-center justify-center rounded-lg text-gray-300">
                                +3
                            </div>
                        </div>
                    </div>

                    {/* Attached Files */}
                    <div className="py-5 border-t border-gray-700">
                        <h4 className="text-xs text-gray-400">SHARED FILES</h4>
                        <div className="mt-2 space-y-3">
                            {/* Placeholder for shared files */}
                            {[
                                { name: "design-notes.pdf", size: "2.3 MB" },
                                { name: "project-overview.docx", size: "1.7 MB" },
                            ].map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-neutral-800 p-2 rounded-lg"
                                >
                                    <div>
                                        <p className="text-white text-sm">{file.name}</p>
                                        <p className="text-gray-400 text-xs">{file.size}</p>
                                    </div>
                                    <button className="text-green-400">
                                        <FaDownload />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }

        if (currentChat.type === 'group' || currentChat.type === 'department') {
            return (
                <div className="w-[350px] bg-neutral-900 text-white  shadow-lg p-4">
                    {/* Profile Section */}
                    <div className="relative">
                        <img
                            src={currentChat.avatarGroup}
                            alt="User"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full">
                            <FaEllipsisV className="text-white" />
                        </button>
                        <div className="mt-3 ml-3 text-left absolute bottom-2 w-full">
                            <h3 className="text-base font-semibold">
                                {currentChat.type === 'department'
                                    ? `# ${currentChat.name}`
                                    : currentChat.name}
                            </h3>
                            <p className="text-gray-400">
                                {currentChat.members?.length || 0} members
                            </p>
                        </div>
                    </div>

                    {/* Group/Department Details */}
                    <div className="mt-4 border-t border-gray-700 py-5">
                        <h4 className="text-xs text-gray-400">DETAILS</h4>
                        <div className="space-y-2 mt-2 text-sm">
                            <p><strong className="mr-1">Type:</strong> {currentChat.type}</p>
                            <p><strong className="mr-1">Created by:</strong> Administrator in system</p>
                            <p><strong className="mr-1">Created on:</strong> {new Date(currentChat.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Members */}
                    <div className="py-5 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs text-gray-400">MEMBERS</h4>
                            <button className="text-green-400 text-xs">Add</button>
                        </div>
                        <div className="mt-2 space-y-3">
                            {currentChat.members?.slice(0, 5).map((member, index) => (
                                <div
                                    key={member._id}
                                    className="flex items-center space-x-3"
                                >
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                            {member.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-white text-sm">{member.name}</p>
                                        <p className="text-gray-400 text-xs">{member.position}</p>
                                    </div>
                                </div>
                            ))}
                            {(currentChat.members?.length || 0) > 5 && (
                                <div className="text-center text-green-400 text-sm mt-2">
                                    +{(currentChat.members?.length || 0) - 5} more
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Media Section */}
                    <div className="py-5 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs text-gray-400">SHARED MEDIA</h4>
                            <button className="text-green-400 text-xs">Show all</button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <div className="w-16 h-16 bg-gray-700 flex items-center justify-center rounded-lg text-gray-300">
                                +3
                            </div>
                        </div>
                    </div>

                    {/* Shared Files */}
                    <div className="py-5 border-t border-gray-700">
                        <h4 className="text-xs text-gray-400">SHARED FILES</h4>
                        <div className="mt-2 space-y-3">
                            {[
                                { name: "project-overview.pdf", size: "5.2 MB" },
                                { name: "team-guidelines.docx", size: "3.1 MB" },
                            ].map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-neutral-800 p-2 rounded-lg"
                                >
                                    <div>
                                        <p className="text-white text-sm">{file.name}</p>
                                        <p className="text-gray-400 text-xs">{file.size}</p>
                                    </div>
                                    <button className="text-green-400">
                                        <FaDownload />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }
        return null;
    }
    const formatReatAt = (date) => {
        //format to get time sent is hh:mm AM/PM
        const options = { hour: '2-digit', minute: '2-digit', hour12: true };
        const formattedDate = new Date(date).toLocaleString([], options);
        return formattedDate;
    }
    const renderReadByUsers = (readBy, createdAt) => {

        // console.log('Read by users:', readBy);
        if (!readBy) return null;

        if (readBy.length === 0) {
            return (
                <div className="text-[10px] text-neutral-500 mt-1">
                    ✔️{formatReatAt(createdAt)}
                </div>
            )
        }

        const displayUsers = readBy.slice(0, 3);
        console.log('Display users:', displayUsers);
        const remainingCount = readBy.length > 3 ? readBy.length - 3 : 0;

        return (
            <div className="text-xs text-neutral-500 mt-1">
                Seen by: {''}
                {displayUsers.map(user => user.user.name).join(', ')}
                {remainingCount > 0 && ` and ${remainingCount} other${remainingCount > 1 ? 's' : ''}`}
            </div>
        )
    }

    const renderReplyPreview = (message) => {
        if (!message.replyTo) return null;

        if (typeof message.replyTo === 'object' && message.replyTo.content && message.replyTo.sender) {
            <div className={`p-2 rounded-t-lg text-sm text-gray-600 border-l-2 border-blue-500 ${message.sender._id === user._id ? 'bg-blue-100' : 'bg-gray-200'} mb-2`}>
                <div className="font-semibold">{message.replyTo.sender.name}</div>
                <div className="truncate">{message.replyTo.content}</div>
            </div>
        }

        const repliedMessageId = typeof message.replyTo === 'object' ? message.replyTo._id : message.replyTo;
        const repliedMessage = messages.find(msg => msg._id === repliedMessageId);

        if (!repliedMessage) {
            return null;
        };
        return (
            <div className={`p-2 rounded-t-lg text-sm text-gray-600 border-l-2 border-blue-500 ${message.sender._id === user._id ? 'bg-neutral-800' : 'bg-neutral-800'} mb-2`}>
                <div className="font-semibold text-xs">{repliedMessage.sender.name}</div>
                <div className="truncate text-xs">{repliedMessage.content}</div>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full dark:text-white">
            <div className="dark:bg-neutral-900 w-[370px] bg-neutral-100">
                {ComponentToRender && <ComponentToRender
                    setCurrentChat={setCurrentChat}
                    currentChat={currentChat}
                />}
            </div>

            <div
                className={`dark:bg-neutral-800 flex transition-all duration-300 ${showInfo ? 'flex-[1.5]' : 'flex-[2.5]'} justify-center items-center`}
            >
                <div className="w-full h-full flex flex-col dark:bg-neutral-900 dark:text-white relative">
                    {/* Header */}
                    {currentChat ? (
                        <>
                            <div className="flex justify-between items-center border-b dark:border-gray-700">
                                {renderChatHeader()}
                                <div className="flex space-x-3 items-center justify-center mr-5">
                                    <button>
                                        <BsSearch />
                                    </button>
                                    <button className="cursor-pointer" onClick={handleShowInfo}>
                                        <FaInfoCircle />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                                    </div>
                                ) : (
                                    <>
                                        {allMessages.map((msg, index, array) => {
                                            const reactionsMap = allReactionsMaps[msg._id];
                                            if (msg.type === 'system') {
                                                return (
                                                    <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                        {msg.content}
                                                    </div>
                                                )
                                            }
                                            const isCurrentUser = msg.sender._id === user._id;
                                            return (
                                                <div key={msg._id} className={`flex justify-${msg.sender._id === user._id ? 'end' : 'start'} mb-4`}>
                                                    {msg.sender._id !== user._id && (
                                                        <div className="flex flex-col item justify-center  space-y-2 items-center">
                                                            <img
                                                                src={msg.sender.avatar || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                                alt="User"
                                                                className="w-8 h-8 rounded-full mr-2"
                                                            />
                                                            <span className="font-semibold mr-2 text-xs">{msg.sender.name}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex flex-col">
                                                            {renderReplyPreview(msg)}
                                                            <div className={`relative max-w-xs w-fit rounded-lg px-3 py-2 ${isCurrentUser ? 'bg-purple-700 text-white' : 'bg-gray-200 dark:bg-neutral-600 dark:text-white w-fit'}`}>
                                                                <div
                                                                    className={``}
                                                                >
                                                                    {
                                                                        msg.content &&
                                                                        <div className="w-fit group">
                                                                            {msg.content}
                                                                            {msg.reactions.length > 0 && (
                                                                                <div
                                                                                    className={`absolute cursor-pointer -bottom-[10px] ${msg.sender._id === user._id ? '-left-2' : '-right-2'} flex items-center justify-center space-x-1 text-gray-400 bg-neutral-700 rounded-full shadow-xl px-1`}
                                                                                    onClick={() => handleShowDetailReaction(msg._id)}
                                                                                >
                                                                                    {Object.entries(reactionsMap).map(([emoji, data]) => (
                                                                                        <span
                                                                                            key={emoji}
                                                                                            className="text-[12px] cursor-pointer flex items-center hover:bg-neutral-600 rounded-full"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleReaction(msg._id, emoji);
                                                                                            }}
                                                                                            title={`${data.users.length} person reacted ${emoji}`}
                                                                                        >
                                                                                            {emoji}
                                                                                        </span>
                                                                                    ))}
                                                                                    <span className="text-xs text-gray-300">
                                                                                        {msg.reactions.length}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {/* reaction details */}
                                                                            {showDetailReaction === msg._id && (
                                                                                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                                                                                    <div className={`p-8 rounded-lg w-[500px] bg-neutral-800 space-y-5`}>
                                                                                        <div className="flex  justify-between items-center">
                                                                                            <h2 className="text-2xl font-bold">Detail reactions</h2>
                                                                                            <MdClose onClick={handleShowDetailReaction} className="bg-neutral-700 rounded-full p-1 text-2xl hover:bg-neutral-600" />
                                                                                        </div>
                                                                                        <div className="bg-neutral-700 rounded-lg flex items-center justify-between">
                                                                                            <button
                                                                                                onClick={() => setActiveTab('all')}
                                                                                                className={`text-xl rounded-full py-1 w-full ${activeTab === 'all' ? 'bg-neutral-600' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                                                                                            >
                                                                                                <p className="text-base">
                                                                                                    All reaction {msg.reactions.length}
                                                                                                </p>
                                                                                            </button>
                                                                                            {Object.entries(reactionsMap).map(([emoji, data]) => (
                                                                                                <button
                                                                                                    key={emoji}
                                                                                                    onClick={() => setActiveTab(emoji)}
                                                                                                    className="text-lg py-0.5 bg-neutral-700 text-center cursor-pointer flex items-center hover:bg-neutral-600 rounded-full justify-center w-full"
                                                                                                >
                                                                                                    {emoji}
                                                                                                    <span className="ml-1 text-xs">{data.count}</span>
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="max-h-[300px] overflow-y-auto">
                                                                                            {activeTab === 'all' ? (
                                                                                                // Sử dụng giá trị đã tính toán trước thay vì tính lại
                                                                                                getUserReactions(msg.reactions).map((item, index) => (
                                                                                                    <div key={index} className="flex items-center justify-between bg-neutral-700 hover:bg-neutral-600 rounded-lg p-2 mb-5">
                                                                                                        <div className="flex items-center">
                                                                                                            <img src={item.user.avatar} alt={item.user.name} className="w-10 h-10 rounded-full mr-3" />
                                                                                                            <div>
                                                                                                                <p>{item.user.name}</p>
                                                                                                                {item.user._id === user._id &&
                                                                                                                    <button
                                                                                                                        onClick={() => handleRemoveReaction(msg._id, item.reactions[0])}
                                                                                                                        className="text-xs text-neutral-400"
                                                                                                                    >
                                                                                                                        Click to remove reaction
                                                                                                                    </button>
                                                                                                                }
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="flex">
                                                                                                            {item.reactions.map((emoji, i) => (
                                                                                                                <span key={i} className="text-xl mr-1">{emoji}</span>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))
                                                                                            ) : (
                                                                                                // Hiển thị reactions cho tab được chọn
                                                                                                msg.reactions
                                                                                                    .filter(reaction => reaction.emoji === activeTab)
                                                                                                    .map((reaction, index) => {
                                                                                                        const userObj = typeof reaction.user === 'object' ? reaction.user : { _id: reaction.user, name: 'Unknown', avatar: '' };
                                                                                                        return (
                                                                                                            <div key={index} className="flex items-center justify-between bg-neutral-700 hover:bg-neutral-600 rounded-lg p-2 mb-5">
                                                                                                                <div className="flex items-center">
                                                                                                                    <img src={userObj.avatar} alt={userObj.name} className="w-10 h-10 rounded-full mr-3" />
                                                                                                                    <div>
                                                                                                                        <p>{userObj.name}</p>
                                                                                                                        {userObj._id === user._id &&
                                                                                                                            <button
                                                                                                                                onClick={() => handleRemoveReaction(msg._id, activeTab)}
                                                                                                                                className="text-xs text-neutral-400"
                                                                                                                            >
                                                                                                                                Click to remove reaction
                                                                                                                            </button>
                                                                                                                        }
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div className="flex">
                                                                                                                    <span className="text-xl mr-1">{reaction.emoji}</span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <div className={`absolute top-3 ${msg.sender._id === user._id ? '-left-20' : '-right-20'} flex items-center justify-center space-x-2 text-xs text-gray-400 
                                                                                    ${activeMessageId === msg._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                                                                                    transition-opacity duration-200`}
                                                                            >
                                                                                <button
                                                                                    onClick={() => handleReply(msg)}
                                                                                >
                                                                                    <FaReply className="dark:hover:bg-neutral-600 hover:bg-neutral-200 rounded-lg p-1 text-xl" />
                                                                                </button>
                                                                                <button onClick={(e) => toggleReaction(msg._id, e)}>
                                                                                    <MdOutlineEmojiEmotions className="dark:hover:bg-neutral-600 hover:bg-neutral-200 rounded-lg p-1 text-xl" />
                                                                                </button>
                                                                                <div className="relative mt-0.5" >
                                                                                    <button onClick={(e) => toggleOptionMenu(msg._id, e)}>
                                                                                        <HiOutlineDotsVertical className="dark:hover:bg-neutral-600 hover:bg-neutral-200 rounded-lg p-1 text-xl" />
                                                                                    </button>
                                                                                    {activeMessageId === msg._id && (
                                                                                        <div className="absolute -right-[90px] -top-3 bg-white dark:text-white dark:bg-neutral-700 rounded-lg shadow-md z-10 flex flex-col items-start w-20 space-y-1 px-1 py-1 option-menu">
                                                                                            <button className="hover:bg-gray-100 dark:hover:bg-neutral-500 rounded-md transition-colors text-left w-full px-1">Pinned</button>
                                                                                            <button className="hover:bg-gray-100 dark:hover:bg-neutral-500 rounded-md transition-colors text-left w-full px-1">Forward</button>
                                                                                            <button
                                                                                                className="hover:bg-gray-100 dark:hover:bg-neutral-500 rounded-md transition-colors text-left w-full px-1"
                                                                                                onClick={() => {
                                                                                                    setShowRecall(!showRecall);
                                                                                                    setActiveMessageId(null);
                                                                                                }}>
                                                                                                Recall
                                                                                            </button>
                                                                                        </div>
                                                                                    )}

                                                                                    {showRecall && (
                                                                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                                                            <div className={`p-8 rounded-lg w-[400px] bg-neutral-900 space-y-5`}>
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <h2 className="text-2xl font-bold dark:text-white">Recall a message</h2>
                                                                                                    <MdClose className="text-lg cursor-pointer" onClick={() => setShowRecall(!showRecall)} />
                                                                                                </div>
                                                                                                <p className="text-sm text-gray-400 mt-9">Are you sure you want to recall this message?</p>
                                                                                                <button className="font-semibold bg-neutral-700 px-3 text-sm py-1 rounded-full hover:dark:bg-neutral-600 transition-colors duration-300 w-full">
                                                                                                    For everyone
                                                                                                </button>
                                                                                                <button className="font-semibold bg-neutral-700 px-3 text-sm py-1 rounded-full hover:dark:bg-neutral-600 transition-colors duration-300 w-full">
                                                                                                    For me
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {activeReaction === msg._id && (
                                                                                <div className={`absolute flex ${msg.sender._id === user._id ? '-right-5' : 'left-5'} -bottom-5 space-x-1 text-xs text-gray-400 bg-white dark:bg-neutral-500 opacity-90 p-1 rounded-full shadow-md z-10 reaction-menu`}>
                                                                                    {REACTIONS.map(({ emoji, name }) => (
                                                                                        <button
                                                                                            key={name}
                                                                                            className="hover:bg-gray-100 dark:hover:bg-neutral-400 p-1 rounded-full transition-colors"
                                                                                            title={name}
                                                                                            onClick={() => handleReaction(msg._id, emoji)}
                                                                                        >
                                                                                            <span className="text-sm">{emoji}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    }
                                                                    {/* Hiển thị hình ảnh */}
                                                                    {msg.images && msg.images.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                                            {msg.images.map((image, index) => (
                                                                                <img key={index} src={image} alt="Sent" className="w-28 h-28 rounded-md object-cover" />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {/* Hiển thị tệp đính kèm */}
                                                                    {msg.file && (
                                                                        <div className="bg-purple-900 text-white p-2 rounded-lg mt-2 flex items-center">
                                                                            <span className="mr-2">📄</span>
                                                                            <a href={msg.file.url} download className="underline">
                                                                                {msg.file.name}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Hiển thị tên người gửi và thời gian */}
                                                                {index === array.length - 1 && (
                                                                    <div className={`absolute -bottom-5 right-0 w-48 flex items-center mt-1 text-[10px] font-mono text-gray-400 ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'}`}>
                                                                        {msg.sender._id === user._id ? (
                                                                            currentChat.type === 'private' ? (
                                                                                <div className="flex items-center space-x-1 h-4">
                                                                                    {msg.status === 'sent' ? (
                                                                                        <span className="text-green-400">✔️</span>
                                                                                    ) : msg.status === 'read' ? (
                                                                                        <span className="text-green-400">✔️✔️</span>
                                                                                    ) : null}
                                                                                    <span className="whitespace-nowrap">
                                                                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit',
                                                                                            hour12: true
                                                                                        })}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                renderReadByUsers(msg.readBy, msg.createdAt)
                                                                            )
                                                                        ) : null}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>
                                                    {msg.sender._id === user._id && (
                                                        <div className="items-center flex flex-col justify-center space-y-2">
                                                            <img
                                                                src={user.avatar || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                                alt="User"
                                                                className="w-8 h-8 rounded-full ml-2"
                                                            />
                                                            <span className="font-semibold ml-2 text-xs">You</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {temporaryMessages.map((message) => (
                                            <div
                                                key={message.tempId}
                                                className="flex item-end mb-4"
                                            >
                                                <div className="ml-0 mr-3 relative">
                                                    <div className="bg-purple-800 text-white rounded-lg p-3 max-w-xs relative group">
                                                        <p>{message.content}</p>
                                                        <div className="flex items-center justify-end mt-1 text-xs text-gray-400">
                                                            <span>
                                                                {new Date().toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            <span className="ml-2 font-semibold">You</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <img
                                                    src={user.avatar || "https://randomuser.me/api/portraits"}
                                                    alt="User"
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef}></div>
                                    </>
                                )}
                            </div>

                            {replyingTo && (
                                <div className={`px-4 py-2 flex items-center justify-between bg-neutral-700`}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">
                                            Replying to {replyingTo.sender.name === user.name ? 'You' : replyingTo.sender.name}
                                        </span>
                                        <span className={`text-sm text-gray-700 truncate dark:text-gray-300  bg-neutral-700`}>
                                            {replyingTo.content}
                                        </span>
                                    </div>
                                    <button
                                        onClick={cancelReply}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <MdClose />
                                    </button>
                                </div>
                            )}

                            {/* Input */}
                            <div className="py-3 px-10 border-t border-gray-700 flex items-center space-x-3">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer"
                                >
                                    <MdAttachFile className="text-2xl hover:bg-neutral-300 rounded-full p-1 text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700" />
                                </label>
                                <MdEmojiEmotions className="text-2xl hover:bg-neutral-300 rounded-full p-1 text-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-700" />
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
                                    placeholder="Type a message..."
                                    className="flex-1 p-2 rounded-lg dark:bg-neutral-800 dark:text-white bg-neutral-200  outline-none"
                                />
                                <button className="ml-2 p-2 bg-purple-800 text-white rounded-lg" onClick={(e) => sendMessage(e)}>
                                    <MdSend />
                                </button>
                            </div>
                            {/* </div> */}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-3xl mb-4">👋</div>
                            <p className="text-lg font-semibold">Select a chat to start messaging</p>
                            <p className="text-sm text-gray-400 text-center mt-2">
                                Click on a contact from the list to begin a conversation
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showInfo && renderInfoSidebar()}
        </div>
    );
});

export default Chat;

