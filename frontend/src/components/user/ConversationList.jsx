import { CiSearch } from "react-icons/ci";
import React, { useState, useEffect } from "react";
import { TbPinnedFilled } from "react-icons/tb";
import { BsThreeDots } from "react-icons/bs";
import { useRef } from "react";
import { TbPinned } from "react-icons/tb";
import { GoArchive } from "react-icons/go";
import { TiDeleteOutline } from "react-icons/ti";
import axios from "axios";
import { useUser } from "../../context/UserContext";


const ConversationList = ({ setCurrentChat, pendingGroupChat }) => {
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const menuRefs = useRef({});
    const dotsRefs = useRef({});
    const { user, socket } = useUser();
    const [activeConv, setActiveConv] = useState(null);

    useEffect(() => {
        if (pendingGroupChat && pendingGroupChat.creator === user._id) {
            setCurrentChat(pendingGroupChat);
        }
    }, [pendingGroupChat, setCurrentChat, user._id]);

    useEffect(() => {
        // Đảm bảo socket tồn tại trước khi đăng ký listener
        if (!socket) return;
        socket.on('chat:new', (data) => {
            setConversations(prev => {
                const updatedConversations = [...prev];

                const existingConvIndex = updatedConversations.findIndex(
                    conv => conv.conversationInfo._id === data.conversationInfo._id
                );

                if (existingConvIndex !== -1) {
                    updatedConversations[existingConvIndex] = {
                        ...updatedConversations[existingConvIndex],
                        ...data
                    };
                } else {
                    updatedConversations.push(data);
                }
                return updatedConversations;
            })
        })

        socket.on('message:sent', (data) => {
            console.log('=====Message sent=====');
            console.log('Conversation info id:', data.message.conversationId);
            console.log('Message conversation id:', data.message.conversationId);
            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.message.conversationId.toString()) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: data.message
                            }
                        }
                    }
                    return conv;
                })
            })
        });
        socket.on('group:created', (data) => {
            console.log('Received group:created event:', data);
            setConversations(prev => {
                const existingConvIndex = prev.findIndex(
                    conv => conv.conversationInfo._id === data.conversationInfo._id
                );
                if (existingConvIndex !== -1) {
                    const updatedConversations = [...prev];
                    updatedConversations[existingConvIndex] = {
                        ...updatedConversations[existingConvIndex],
                        ...data
                    };
                    return {
                        ...updatedConversations,
                        unreadCount: data.newConversation.creator === user._id ? 0 : 1
                    };
                } else {
                    return [...prev, data];
                }
            });
        })
        const handleNewMessage = (data) => {
            console.log('Received message:new event:', data);
            console.log('Current conversations state:', conversations.map(c => c.conversationInfo?._id));

            setConversations(prev => {
                return prev.map(conv => {
                    // Normalize both IDs to strings for comparison
                    const convId = conv.conversationInfo?._id?.toString();
                    const dataId = data.conversationId?.toString();

                    console.log(`Comparing conv ID: ${convId} with data ID: ${dataId}`);

                    if (convId === dataId) {
                        const isCurrentUserSender = data.message?.sender?._id === user?._id;
                        console.log('Found matching conversation, updating lastMessage');
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: data.lastMessage || data.message
                            },
                            unreadCount: isCurrentUserSender ? 0 : (data.unreadCount ?? conv.unreadCount ?? 0)
                        };
                    }
                    return conv;
                });
            });
        };
        const handleGroupAdded = (data) => {
            if (data) {
                setConversations(prev => {
                    const existingConv = prev.find(
                        conv => conv.conversationInfo._id.toString() === data.conversationId.toString()
                    );

                    if (existingConv) {
                        return prev.map(conv => {
                            if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                                return {
                                    ...conv,
                                    conversationInfo: {
                                        ...conv.conversationInfo,
                                        lastMessage: data.lastMessage
                                    },
                                    unreadCount: data.isIncrement
                                        ? conv.unreadCount + 1
                                        : data.unreadCount
                                };
                            }
                            return conv;
                        })
                    } else {
                        return [data.conversation, ...prev];
                    }
                })
            }
        }
        const handleUpdateMembers = (data) => {
            console.log('Received added members:', data);
            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        const newUnreadCount = data.isIncrement
                            ? conv.unreadCount + 1
                            : data.unreadCount;
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: data.lastMessage,
                            },
                            unreadCount: newUnreadCount
                        };
                    }
                    return conv;
                });
            });
        }

        const handleRemoveMembers = (data) => {
            console.log('Received removed members:', data);
            setConversations(prev =>
                prev.filter(conv =>
                    conv.conversationInfo._id.toString() !== data.conversationId.toString()
                )
            );

            setActiveChat(prev => {
                if (prev && prev.conversationId.toString() === data.conversationId.toString()) {
                    setCurrentChat(null);
                    return null;
                }
                return prev;
            })
        }

        const handleUpdateInfoGroup = (data) => {
            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: data.lastMessage,
                                name: data.name || conv.conversationInfo.name,
                                avatarGroup: data.avatarGroup || conv.conversationInfo.avatarGroup
                            }
                        };
                    }
                    return conv;
                });
            })
        }

        // Thêm handler cho backup event
        const handleChatUpdate = (data) => {
            console.log('Received chat:update event:', data);
            if (data.type === 'new_message') {
                handleNewMessage(data.data);
            }

            if (data.type === 'recall_message') {
                handleRecallMessage(data.data);
            }
            if (data.type === 'update_members') {
                handleUpdateMembers(data.data);
            }
            if (data.type === 'update_group_info') {
                handleUpdateInfoGroup(data.data);
            }
        };

        // Đăng ký các listeners với hàm xử lý riêng biệt
        socket.on('message:new', handleNewMessage);
        socket.on('chat:update', handleChatUpdate);
        socket.on('group:removed', handleRemoveMembers);
        socket.on('group:left', handleRemoveMembers);
        socket.on('group:added', handleGroupAdded);

        socket.on('conversation:update', (data) => {
            setConversations(prev => {
                return prev.map(conv => {
                    const convId = conv.conversationInfo?._id?.toString();
                    const dataId = data.conversationId.toString();

                    if (convId === dataId) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: data.lastMessage
                            }
                        };
                    }
                    return conv;
                })
            })
        })

        socket.on('conversation:unread', (data) => {
            setConversations(prev =>
                prev.map(conv =>
                    conv._id === data.conversationId.toString()
                        ? {
                            ...conv,
                            unreadCount: data.unreadCount
                        }
                        : conv
                )
            )
        })

        socket.on('conversation:read', (data) => {
            console.log('Received conversation:read data:', data);
            setConversations(prev =>
                prev.map(conv =>
                    conv.conversationInfo._id?.toString() === data.conversationId?.toString()
                        ? {
                            ...conv,
                            unreadCount: 0
                        }
                        : conv
                )
            )
            console.log('Updated conversations:', conversations);
        });

        socket.on('message:reply-success', (data) => {
            console.log('Received message:reply-success data:', data);
        })

        const handleRecallMessage = (data) => {
            console.log('Received message:recall-success data:', data);
            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        const isCurrentUserActor = data.actor._id === user._id;
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: {
                                    ...conv.conversationInfo.lastMessage,
                                    isRecalled: true,
                                    recallType: data.recallType,
                                    content: data.recallType === 'everyone'
                                        ? (isCurrentUserActor ? "You recalled a message" : `${data.actor.name} recalled a message`)
                                        : (isCurrentUserActor ? "You recalled a message" : conv.conversationInfo.lastMessage.content)
                                }
                            }
                        };
                    }
                    return conv;
                });
            });
        }

        // Đăng ký listener cho message:recall-success
        socket.on('message:recall-success', handleRecallMessage);
        socket.on('user:updated', (data) => {
            if (data.userId === user._id) {
                setConversations(prev => {
                    return prev.map(conv => {
                        if (conv.conversationInfo.members) {
                            const updatedMembers = conv.conversationInfo.members.map(member => {
                                if (member._id === data.userId) {
                                    return {
                                        ...member,
                                        name: data.updateFields.name || member.name,
                                        avatar: data.updateFields.avatar || member.avatar,
                                    };
                                }
                                return member;
                            });
                            return {
                                ...conv,
                                conversationInfo: {
                                    ...conv.conversationInfo,
                                    members: updatedMembers
                                }
                            };
                        }
                        return conv;
                    });
                });
            } else if (data.userId !== user._id) {
                setConversations(prev => {
                    return prev.map(conv => {
                        if (conv.conversationInfo.members) {
                            const updatedMembers = conv.conversationInfo.members.map(member => {
                                if (member._id === data.userId) {
                                    return {
                                        ...member,
                                        name: data.updateFields.name || member.name,
                                        avatar: data.updateFields.avatar || member.avatar,
                                    };
                                }
                                return member;
                            });
                            return {
                                ...conv,
                                conversationInfo: {
                                    ...conv.conversationInfo,
                                    members: updatedMembers
                                }
                            };
                        }
                        return conv;
                    });
                });
            }
        })

        // Cleanup function
        return () => {
            console.log('Cleaning up socket listeners in ConversationList');
            socket.off('message:recall-success');
            socket.off('chat:new');
            socket.off('message:new', handleNewMessage);
            socket.off('chat:update', handleChatUpdate);
            socket.off('group:created');
            socket.off('group:added', handleGroupAdded);
            socket.off('group:removed', handleRemoveMembers);
            socket.off('group:left', handleRemoveMembers);
            socket.off('message:sent');
            socket.off('conversation:update');
            socket.off('conversation:unread');
            socket.off('conversation:read');
            socket.off('message:reply-success');
        };
    }, [socket, user, setCurrentChat]); // Thêm user._id vào dependency array

    const fetchConversations = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/conversation/user/${user._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                setConversations(response.data.data);
                console.log('Conversations:', response.data.data);
            }
        } catch (error) {
            console.log(error);
        }
    }
    useEffect(() => {
        fetchConversations();
    }, [user._id]);

    useEffect(() => {
        const handleGlobalClick = (event) => {
            let isClickInsideMenu = false;
            let isClickOnDots = false;

            Object.values(menuRefs.current).forEach((menu) => {
                if (menu && menu.contains(event.target)) {
                    isClickInsideMenu = true;
                }
            });

            Object.values(dotsRefs.current).forEach((dots) => {
                if (dots && dots.contains(event.target)) {
                    isClickOnDots = true;
                }
            });

            if (!isClickInsideMenu && !isClickOnDots) {
                setActiveChat(null);
            }
        };

        document.addEventListener("click", handleGlobalClick, true);
        return () => {
            document.removeEventListener("click", handleGlobalClick, true);
        };
    }, []);

    const formatSentAt = (sentAt) => {
        const date = new Date(sentAt);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        return `${hours % 12}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
    };

    const handleConversationClick = (conversation) => {
        console.log('Clicked conversation:', conversation);

        if (activeConv) {
            socket.emit('conversation:leave', {
                conversationId: activeConv._id
            });
        }
        console.log(`Joining room: ${conversation._id}`);
        socket.off('chat:loaded'); // Gỡ bỏ listener trước khi thêm mới

        setConversations(prev =>
            prev.map(conv =>
                conv.conversationInfo._id === conversation._id
                    ? {
                        ...conv,
                        unreadCount: 0, // Đặt lại số lượng chưa đọc
                        conversationInfo: {
                            ...conv.conversationInfo,
                            lastMessage: conv.conversationInfo.lastMessage
                                ? {
                                    ...conv.conversationInfo.lastMessage,
                                    status: 'read'
                                } : null
                        }
                    } : conv
            )
        )

        setCurrentChat(conversation);
        socket.on('chat:loaded', (data) => {
            console.log('Received chat:loaded data:', data);

            if (!data || !data.conversation) {
                console.error('No conversation data received', data);
                return;
            }
            const chatToSet = {
                ...data.conversation,
                conversationType: conversation.type,
                members: data.conversation.members || []
            };

            setCurrentChat(chatToSet);

            socket.emit('conversation:mark-read', {
                conversationId: data.conversation._id
            });
            console.log(`Entering conversation: ${data.conversation._id}`);
            socket.emit('conversation:enter', {
                conversationId: data.conversation._id,
            });

            setActiveConv(data.conversation);
        });

        // Emit sự kiện chat:init
        socket.emit('chat:init', {
            contactId: conversation._id,
            conversationType: conversation.type,
            conversationInfo: conversation
        });
    }

    const renderLastMessage = (msg, conversationType) => {
        // console.log('Rendering last message:', msg.metadata);
        if (!msg) return null;
        if (msg.type === 'multimedia') {
            const file = msg.attachments.find(attachment => attachment.fileType === 'image');
            if (file) {
                if (msg.sender._id === user._id) {
                    return `You sent a photo`;
                }
                return `${msg.sender.name} sent a photo`;
            } else {
                if (msg.sender._id === user._id) {
                    return `You sent a file`;
                }
                return `${msg.sender.name} sent a file`;
            }
        }
        if (msg.metadata?.action === 'member_added') {
            const { addedBy, addedMembers } = msg.metadata || {};

            if (!addedBy || !addedMembers) return msg.content;

            const memberNames = addedMembers.map(m => m.name).join(', ');
            if (addedBy._id === user._id) {
                return `You added ${memberNames}`;
            }
            if (addedMembers.some(m => m._id === user._id)) {
                return `${addedBy.name} added you`;
            }

            return `${addedBy.name} added ${memberNames}`;
        }
        if (msg.metadata?.action === 'member_removed') {
            const { removedBy, removedMembers } = msg.metadata || {};

            if (!removedBy || !removedMembers) return msg.content;

            const memberNames = removedMembers.map(m => m.name).join(', ');
            if (removedBy._id === user._id) {
                return `You removed ${memberNames}`;
            }
            if (removedMembers.some(m => m._id === user._id)) {
                return `${removedBy.name} removed you`;
            }

            return `${removedBy.name} removed ${memberNames}`;
        }
        if (msg.metadata?.action === 'member_left') {
            const { leftBy } = msg.metadata || {};

            if (!leftBy) return msg.content;
            return `${leftBy.name} left`;
        }
        if (msg.metadata?.action === 'admin_transferred') {
            const { transferredBy, newAdmin } = msg.metadata || {};

            const memberNames = newAdmin.name
            if (transferredBy._id === user._id) {
                return `You transferred admin rights to ${memberNames}`;
            }
            if (newAdmin._id === user._id) {
                return `${transferredBy.name} transferred admin rights to you`;
            }
            return `${transferredBy.name} transferred admin rights to ${memberNames}`;
        }
        if (msg.metadata?.action === 'deputy_transferred') {
            const { transferredBy, newDeputy } = msg.metadata || {};

            const memberNames = newDeputy.name
            if (transferredBy._id === user._id) {
                return `You transferred deputy admin rights to ${memberNames}`;
            }
            if (newDeputy._id === user._id) {
                return `${transferredBy.name} transferred deputy admin rights to you`;
            }
            return `${transferredBy.name} transferred deputy admin rights to ${memberNames}`;
        }
        if (msg.metadata?.action === 'group_info_updated') {
            const { updatedBy, groupInfo } = msg.metadata || {};
            if (!updatedBy || !groupInfo) return null;

            const { name, avatarGroup } = groupInfo || {};

            if (name) {
                if (updatedBy._id === user._id) {
                    return `You changed group name to ${name}`;
                }
                return `${updatedBy.name} changed group name to ${name}`;
            } else if (avatarGroup) {
                if (updatedBy._id === user._id) {
                    return `You changed group avatar`;
                }
                return `${updatedBy.name} changed group avatar`;
            }
        }
        if (msg.isRecalled) {
            if (msg.recallType === 'everyone') {
                return msg.sender._id === user._id ? "You recalled a message" : `${msg.sender.name} recalled a message`;
            } else if (msg.recallType === 'self') {
                return msg.sender._id === user._id ? "You recalled a message" : msg.content;
            }
        }
        const isSender = msg.sender._id === user._id || msg.sender === user._id;

        if (conversationType === 'private') {
            return isSender ? `You: ${msg.content}` : msg.content;
        } else {
            if (msg.type === 'system') {
                return msg.content;
            }
            const prefix = isSender ? "You" : msg.sender.name;
            return `${prefix}: ${msg.content}`;
        }

    }
    return (
        <div className="p-4 w-full z-0">
            <h1 className="text-2xl">Chats</h1>
            <div className="mt-5 flex items-center">
                <div className="absolute flex items-center dark:text-white dark:hover:text-gray-500 ml-2">
                    <CiSearch className="text-gray-400 text-3xl hover:bg-neutral-600 p-1 rounded-full" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-2 rounded-3xl w-full border border-gray-300 dark:border-neutral-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white"
                    placeholder="Search..."
                />
            </div>
            <div className="mt-5">
                {conversations.length > 0 ? (
                    <div className="flex flex-wrap justify-center space-x-5">
                        {conversations.map((chat) => {
                            let otherUser = null;
                            if (chat.conversationInfo.type === 'private') {
                                otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                            }
                            return (
                                <React.Fragment key={chat.conversationInfo._id}>
                                    {chat.conversationInfo.type === 'private' && (
                                        <div
                                            className="relative cursor-pointer p-4"
                                            onClick={() => handleConversationClick(chat.conversationInfo)}

                                        >
                                            <div className="absolute bottom-0 left-0 w-full h-3/4 dark:bg-neutral-800 rounded-lg bg-neutral-200"></div>

                                            <div className="relative flex flex-col items-center">
                                                <img
                                                    src={otherUser?.avatar}
                                                    alt={otherUser?.name}
                                                    className="w-10 h-10 rounded-full z-10 shadow-lg border-2 border-white dark:border-neutral-800"
                                                />
                                                {otherUser?.status === "online" ? (
                                                    <div className="w-3 h-3 bg-green-500 rounded-full absolute top-7 right-1 z-20"></div>
                                                ) : (
                                                    <div className="w-3 h-3 bg-gray-500 rounded-full absolute  top-7 right-1 z-20"></div>
                                                )}
                                                <div className="font-semibold text-sm text-center dark:text-white mt-1 z-10">{otherUser?.name}</div>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex items-center w-full justify-center h-20 ">
                        <p className="text-center">Let's started chat</p>
                    </div>
                )}

            </div>
            <div className="overflow-y-auto scrollbar-none mt-5 max-h-[600px]">
                <div className="mt-4">
                    <h1 className="font-semibold mb-5">Channels</h1>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                        {conversations
                            .filter(chat => chat.conversationInfo.type === 'department')
                            .map((chat) => (
                                <div
                                    key={chat._id}
                                    className="p-3 rounded-lg dark:hover:bg-neutral-800 cursor-pointer mb-4 hover:bg-neutral-300"
                                    onClick={() => handleConversationClick(chat.conversationInfo)}
                                >
                                    <div className="flex items-center w-full justify-between">
                                        <div className="relative mr-3">
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg ">
                                                {chat.conversationInfo.name.charAt(0) + chat.conversationInfo.name.charAt(1)}
                                            </div>
                                        </div>
                                        <div className="w-[190px]">
                                            <div className="font-semibold">{chat.conversationInfo.type === 'department' ? `#${chat.conversationInfo.name}` : `${chat.conversationInfo.name}`}</div>
                                            {chat.conversationInfo.lastMessage.type === 'system' ? (
                                                <div className={`text-sm ${chat.unreadCount > 0 ? 'font-bold dark:text-white' : 'text-neutral-500'}`}>
                                                    {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                </div>
                                            ) :
                                                <div className={`text-sm flex truncate ${chat.unreadCount > 0 ? "font-bold text-black dark:text-white" : "text-neutral-500"}`}>
                                                    {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                </div>
                                            }
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt)}</div>
                                            <div className="flex justify-between">
                                                {chat.unreadCount > 0 && (
                                                    <div className="text-xs dark:text-red-400 text-red-200 dark:bg-red-900 font-semibold bg-red-500 dark:bg-opacity-30  px-2 rounded-full w-fit">
                                                        {chat.unreadCount}
                                                    </div>
                                                )}
                                                {chat.conversationInfo.type === 'department' && chat.conversationInfo.pinned ? <TbPinnedFilled className="dark:text-white text-black" /> : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="mt-4">
                    <h1 className="font-semibold mb-5">Groups</h1>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                        {conversations
                            .filter(chat => chat.conversationInfo.type === 'group')
                            .map((chat) => (
                                <div
                                    key={chat._id}
                                    className="p-3 rounded-lg dark:hover:bg-neutral-800 cursor-pointer mb-4 hover:bg-neutral-300"
                                    onClick={() => handleConversationClick(chat.conversationInfo)}
                                >
                                    <div className="flex items-center w-full justify-between">
                                        <div className="relative mr-3">
                                            <img src={chat.conversationInfo.avatarGroup} alt="" className="w-8 h-8 rounded-full" />
                                        </div>
                                        <div className="w-[190px]">
                                            <div className="font-semibold">{chat.conversationInfo.type === 'department' ? `#${chat.conversationInfo.name}` : `${chat.conversationInfo.name}`}</div>
                                            {chat.conversationInfo.lastMessage?.type === 'system' ? (
                                                <div className={`text-sm ${chat.unreadCount > 0 ? 'font-bold dark:text-white' : 'text-neutral-500'}`}>
                                                    {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                </div>
                                            ) :
                                                <div className={`text-sm flex truncate ${chat.unreadCount > 0 ? "font-bold text-black dark:text-white" : "text-neutral-500"}`}>
                                                    {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                </div>
                                            }
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt)}</div>
                                            <div className="flex justify-between">
                                                {chat.unreadCount > 0 && (
                                                    <div className="text-xs dark:text-red-400 text-red-200 dark:bg-red-900 font-semibold bg-red-500 dark:bg-opacity-30  px-2 rounded-full w-fit">
                                                        {chat.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="mt-4">
                    <h1 className="font-semibold mb-5">Recent</h1>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                        {conversations.length > 0 ? (
                            conversations.map((chat) => {
                                let otherUser = null;
                                if (chat.conversationInfo.type === 'private') {
                                    otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                                }
                                return (
                                    <React.Fragment key={chat._id}>
                                        {chat.conversationInfo.type === 'private' && (
                                            <div
                                                className="p-3 rounded-lg dark:hover:bg-neutral-800 cursor-pointer mb-4 hover:bg-neutral-300 relative group"
                                                onClick={() => handleConversationClick(chat.conversationInfo)}
                                            >
                                                <div className="flex items-center w-full justify-between">
                                                    <div className="relative mr-3">
                                                        <img
                                                            src={otherUser?.avatar}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                        {otherUser?.status === "online" ? (
                                                            <div className="w-3 h-3 bg-green-500 rounded-full absolute bottom-0 right-0"></div>
                                                        ) : (
                                                            <div className="w-3 h-3 bg-gray-500 rounded-full absolute bottom-0 right-0"></div>
                                                        )}
                                                    </div>
                                                    <div className="w-[190px]">
                                                        <div className="font-semibold">{otherUser?.name}</div>
                                                        <div className="flex items-center justify-between">
                                                            {chat.conversationInfo.lastMessage && (
                                                                <div className={`text-sm truncate ${chat.unreadCount > 0 ? "font-bold text-black dark:text-white" : "text-neutral-500"}`}>
                                                                    {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 text-right flex flex-col space-y-2 ">
                                                        <div>
                                                            {chat.conversationInfo.lastMessage?.sentAt ?
                                                                formatSentAt(chat.conversationInfo.lastMessage.sentAt) : ""
                                                            }
                                                        </div>
                                                        {chat.unreadCount > 0 && (
                                                            <div className="text-xs dark:text-red-400 text-red-200 dark:bg-red-900 font-semibold bg-red-500 dark:bg-opacity-30 px-2 rounded-full w-fit">
                                                                {chat.unreadCount}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`absolute right-2 top-3 dark:bg-neutral-700 p-1 rounded-full 
                                             ${activeChat === chat.id ? "block" : "hidden group-hover:block"}`}
                                                >
                                                    <BsThreeDots
                                                        ref={(el) => (dotsRefs.current[chat._id] = el)}
                                                        className="w-3 h-3 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveChat(activeChat === chat._id ? null : chat._id);
                                                        }}
                                                    />
                                                    {activeChat === chat._id && (
                                                        <div ref={(el) => (menuRefs.current[chat._id] = el)} className="absolute right-2 top-8 bg-white dark:bg-neutral-800  shadow-lg rounded-md w-24 p-2 text-sm">
                                                            <div className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center">
                                                                <TbPinned className="text-sm col-span-1" />
                                                                <p className="col-span-2">Pinned</p>
                                                            </div>
                                                            <div className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center ">
                                                                <GoArchive className="text-sm" />
                                                                <p className="">Archive</p>
                                                            </div>
                                                            <div className="hover:bg-red-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer text-red-600 grid grid-cols-3 items-center ">
                                                                <TiDeleteOutline className="text-sm" />
                                                                <p>Delete</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                )
                            })
                        ) : (
                            <div className="flex items-center w-full justify-center h-20 ">
                                <p className="text-center">Let's started chat</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
};

export default ConversationList;