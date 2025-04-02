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


const ConversationList = ({ setCurrentChat }) => {
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const menuRefs = useRef({});
    const dotsRefs = useRef({});
    const { user, socket } = useUser();
    const [activeConv, setActiveConv] = useState(null);

    useEffect(() => {
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
        fetchConversations();

        const reconnectSocketListener = () => {

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
            socket.on('message:new', (data) => {
                setConversations(prev => {
                    return prev.map(conv => {
                        // Normalize both IDs to strings for comparison
                        const convId = conv.conversationInfo?._id?.toString();
                        const dataId = data.conversationId?.toString();

                        if (convId === dataId) {
                            return {
                                ...conv,
                                conversationInfo: {
                                    ...conv.conversationInfo,
                                    lastMessage: data.message,
                                },
                                unreadCount: data.unreadCount || conv.unreadCount || 0
                            };
                        }
                        return conv;
                    });
                });
            });

            socket.on('conversation:update', (data) =>{
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
        }
        reconnectSocketListener();
        return () => {
            socket.off('chat:new');
            socket.off('message:new');
            socket.off('message:sent');
            socket.off('conversation:update');
            socket.off('conversation:unread');
            socket.off('conversation:read');
            socket.off('message:reply-success');
        }
    }, [socket]);

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

        // Kiểm tra và rời khỏi conversation hiện tại
        if (activeConv) {
            socket.emit('conversation:leave', {
                conversationId: activeConv._id
            });
        }

        socket.off('chat:loaded'); // Gỡ bỏ listener trước khi thêm mới

        setConversations(prev =>
            prev.map(conv =>
                conv.conversationInfo._id === conversation._id
                    ? {
                        ...conv,
                        unreadCount: 0, // Đặt lại số lượng chưa đọc
                        conversationInfo:{
                            ...conv.conversationInfo,
                            lastMessage: conv.conversationInfo.lastMessage
                            ? {
                                ...conv.conversationInfo.lastMessage,
                                status: 'read' // Đánh dấu là đã đọc
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

    // useEffect(() => {
    //     socket.on('chat:new', (data) => {
    //         console.log('Received chat:new data:', {
    //             conversationId: data.conversation.conversationInfo._id,
    //             messageId: data.message._id,
    //             unreadCount: data.conversation.unreadCount
    //         });
    //         setConversations(prev => {
    //             const newConversations = [...prev];
    //             const conversationId = data.conversation.conversationInfo._id;
    //             const index = newConversations.findIndex(conv => 
    //                 conv.conversationInfo._id.toString() === conversationId.toString()
    //             );

    //             if (index !== -1) {
    //                 const updatedConversation = {
    //                     ...newConversations[index],
    //                     conversationInfo: {
    //                         ...newConversations[index].conversationInfo,
    //                         lastMessage: data.message  // Update last message
    //                     },
    //                     unreadCount: data.conversation.unreadCount
    //                 };

    //                 newConversations.splice(index, 1);
    //                 newConversations.unshift(updatedConversation);
    //             } else {
    //                 // If conversation doesn't exist, add it
    //                 newConversations.unshift(data.conversation);
    //             }

    //             return newConversations;
    //         });
    //     });

    //     return () => {
    //         socket.off('chat:new');
    //     };
    // }, [socket]);
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
                                            onClick={() => handleConversationClick(otherUser)}

                                        >
                                            <div className="absolute bottom-0 left-0 w-full h-3/4 dark:bg-neutral-800 rounded-lg bg-neutral-200"></div>

                                            <div className="relative flex flex-col items-center">
                                                <img
                                                    src={otherUser?.avatar}
                                                    alt={otherUser?.name}
                                                    className="w-10 h-10 rounded-full z-10"
                                                />
                                                {otherUser?.status === "online" ? (
                                                    <div className="w-3 h-3 bg-green-500 rounded-full absolute  top-7 right-1 z-20"></div>
                                                ) : (
                                                    <div className="w-3 h-3 bg-gray-500 rounded-full absolute  top-7 right-4 z-20"></div>
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
            <div className="mt-4">
                <h1 className="font-semibold mb-5">Channels</h1>
                <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                    {conversations
                        .filter(chat => chat.conversationInfo.type === 'department' || chat.conversationInfo.type === 'group')
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
                                            <div className={`text-sm text-gray-400 uppercase ${chat.unreadCount > 0 ? 'font-bold' : ''}`}>{chat.conversationInfo.lastMessage.content}</div>
                                        ) :
                                            <div className={`text-sm flex truncate ${chat.unreadCount > 0 ? "font-bold text-black dark:text-white" : "text-neutral-500"}`}>
                                                <div className="mr-1">
                                                    {
                                                        chat.conversationInfo.lastMessage.sender._id === user._id ? "You" : chat.conversationInfo.lastMessage.sender.name
                                                    }:
                                                </div>
                                                {chat.conversationInfo.lastMessage.content}
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
                                                                {
                                                                    chat.conversationInfo.lastMessage.sender._id === user._id ? "You: " : "" ||
                                                                        chat.conversationInfo.lastMessage.sender === user._id ? "You: " : ""
                                                                }
                                                                {chat.conversationInfo.lastMessage.content}
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
                                                    ref={(el) => (dotsRefs.current[chat._id] = el)} // Lưu ref của từng dấu ba chấm
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
    )
};

export default ConversationList;