import { CiSearch } from "react-icons/ci";
import React, { useState, useEffect } from "react";
import { TbPin, TbPinnedFilled } from "react-icons/tb";
import { BsThreeDots } from "react-icons/bs";
import { useRef } from "react";
import { TbPinned } from "react-icons/tb";
import { GoArchive } from "react-icons/go";
import { TiDeleteOutline } from "react-icons/ti";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import MenuPortal from './MenuPortal';
import clientEncryptionService from "../../helper/encryptionService";


const ConversationList = ({ setCurrentChat, pendingGroupChat, highlightConversationId }) => {
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const menuRefs = useRef({});
    const dotsRefs = useRef({});
    const { user, socket, getUserStatus, refreshUserStatus } = useUser();
    const [activeConv, setActiveConv] = useState(null);
    const [menuPosition, setMenuPosition] = useState({});
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all"); // State to track the active tab

    // Handle highlighting when highlightConversationId changes
    useEffect(() => {
        if (highlightConversationId) {
            setSelectedConversationId(highlightConversationId);
        }
    }, [highlightConversationId]);

    useEffect(() => {
        if (pendingGroupChat && pendingGroupChat.creator === user._id) {
            setCurrentChat(pendingGroupChat);
        }
    }, [pendingGroupChat, setCurrentChat, user._id]);
    // console.log("User in ConversationList:", user);
    useEffect(() => {

        if (!socket) return;
        const updateConversationsWithStatus = () => {
            setConversations(prev =>
                prev.map(conv => {
                    // Chỉ cập nhật cho cuộc trò chuyện private
                    if (conv.conversationInfo.type === 'private') {
                        // Tìm thành viên khác không phải user hiện tại
                        const otherMember = conv.conversationInfo.members.find(
                            member => member._id !== user?._id
                        );

                        if (otherMember) {
                            // Cập nhật trạng thái của thành viên đó
                            const updatedMembers = conv.conversationInfo.members.map(member => {
                                if (member._id === otherMember._id) {
                                    const currentStatus = getUserStatus(member._id);
                                    return {
                                        ...member,
                                        status: currentStatus
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
                    }
                    return conv;
                })
            );
        };

        // Listen for user status changes
        const handleUserStatus = (data) => {
            // console.log('Received status update in ConversationList:', data);
            updateConversationsWithStatus();
        };

        // Listen for bulk status updates
        const handleBulkStatus = (data) => {
            // console.log('Received bulk status updates in ConversationList:', data);
            updateConversationsWithStatus();
        };

        socket.on('user:status', handleUserStatus);
        socket.on('user:status-bulk', handleBulkStatus);

        // Initial status update
        updateConversationsWithStatus();

        // Periodic refresh of user statuses
        const statusInterval = setInterval(() => {
            refreshUserStatus();
            updateConversationsWithStatus();
        }, 15000);
        const handleChatNew = (data) => {
            console.log('Received chat:new event:', data);

            setConversations(prev => {
                const updatedConversations = [...prev];
                const existingConvIndex = updatedConversations.findIndex(
                    conv => conv.conversationInfo._id === data.newConversation._id
                );

                if (existingConvIndex !== -1) {
                    // Update existing conversation
                    updatedConversations[existingConvIndex] = {
                        ...updatedConversations[existingConvIndex],
                        conversationInfo: data.newConversation,
                        unreadCount: data.newConversation.lastMessage ? 1 : 0
                    };
                } else {
                    // Add new conversation
                    updatedConversations.push({
                        conversationInfo: data.newConversation,
                        unreadCount: data.newConversation.lastMessage ? 1 : 0
                    });

                    // **QUAN TRỌNG**: Join room để nhận message:new
                    socket.emit('conversation:enter', { conversationId: data.newConversation._id });
                }

                return updatedConversations;
            });
        };
        socket.on('chat:new', handleChatNew); // **THÊM**

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
        });
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
        const handleGroupAdded = async (data) => {
            if (data) {
                // Decrypt the last message content and attachments if they exist
                let lastMessage = data.lastMessage;
                if (lastMessage && lastMessage.content) {
                    try {
                        lastMessage = {
                            ...lastMessage,
                            content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                        };

                        // Decrypt attachment filenames if present
                        if (lastMessage.attachments && lastMessage.attachments.length > 0) {
                            const decryptedAttachments = await Promise.all(
                                lastMessage.attachments.map(async (attachment) => ({
                                    ...attachment,
                                    fileName: await clientEncryptionService.decryptMessage(attachment.fileName, data.conversationId)
                                }))
                            );
                            lastMessage = {
                                ...lastMessage,
                                attachments: decryptedAttachments
                            };
                        }
                    } catch (error) {
                        console.error('Error decrypting message in handleGroupAdded:', error);
                    }
                }

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
                                        lastMessage: lastMessage
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

        const handleUpdateMembers = async (data) => {
            console.log('Received added members:', data);
            const conversationIdStr = data?.conversationId?.toString();

            if (data.lastMessage.metadata?.action === 'member_removed') {
                if (data.lastMessage.metadata?.removedMembers.map(m => m._id).includes(user._id)) {
                    setConversations(prev => {
                        return prev.filter(conv => conv.conversationInfo._id.toString() !== data.conversationId.toString())
                    })
                    setCurrentChat(null);
                    return null;
                }
            }

            // Decrypt the last message content if it exists
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };
                } catch (error) {
                    console.error('Error decrypting message in handleUpdateMembers:', error);
                }
            }

            const isNewConv = data.sourceAction === 'role_update' &&
                (data.lastMessage.metadata?.action === 'member_added' ||
                    data.lastMessage.metadata?.action === 'header_assigned' ||
                    data.lastMessage.metadata?.action === 'deputy_assigned'
                );

            if (isNewConv && data.lastMessage.metadata.userChange._id === user._id) {
                setConversations(prev => {
                    // Check if conversation already exists in the list
                    const conversationExists = prev.some(
                        conv => conv.conversationInfo._id.toString() === conversationIdStr
                    );

                    if (conversationExists) {
                        // If it exists, just update it instead of adding a new one
                        return prev.map(conv => {
                            if (conv.conversationInfo._id.toString() === conversationIdStr) {
                                return {
                                    ...conv,
                                    conversationInfo: {
                                        ...conv.conversationInfo,
                                        name: data.name || conv.conversationInfo.name,
                                        members: data.members || conv.conversationInfo.members,
                                        lastMessage: lastMessage || conv.conversationInfo.lastMessage,
                                    },
                                    unreadCount: data.isIncrement ? conv.unreadCount + 1 : (data.unreadCount || 1)
                                };
                            }
                            return conv;
                        });
                    } else {
                        // If it doesn't exist, add it as a new conversation
                        const newConversation = {
                            conversationInfo: {
                                _id: data.conversationId,
                                type: 'department',
                                name: data.name,
                                members: data.members || [],
                                lastMessage: lastMessage
                            },
                            unreadCount: data.unreadCount || 1
                        };

                        console.log('Adding new conversation to list:', newConversation);
                        return [...prev, newConversation];
                    }
                });

                // We've handled the specific case, so we can return early
                return;
            }
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
                                members: data.members || conv.conversationInfo.members,
                                lastMessage: lastMessage || conv.conversationInfo.lastMessage,
                            },
                            unreadCount: newUnreadCount || 0
                        };
                    }
                    return conv;
                });
            });

            if (activeChat === data.conversationId) {
                setCurrentChat(prev => {
                    if (prev.conversationId.toString() === data.conversationId.toString()) {
                        return {
                            ...prev,
                            members: data.members || prev.members,
                            lastMessage: lastMessage || prev.lastMessage
                        };
                    }
                    return prev;
                });
            }

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

        const handleUpdateInfoGroup = async (data) => {
            // Decrypt the last message content if it exists
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };
                } catch (error) {
                    console.error('Error decrypting message in handleUpdateInfoGroup:', error);
                }
            }

            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: lastMessage,
                                name: data.name || conv.conversationInfo.name,
                                avatarGroup: data.avatarGroup || conv.conversationInfo.avatarGroup
                            }
                        };
                    }
                    return conv;
                });
            })
        }        // Thêm handler cho backup event
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
            if (data.type === 'last_message_update') {
                handleLastMessageUpdate(data.data);
            }
        };

        const handleLastMessageUpdate = async (data) => {
            console.log('Received last_message_update:', data);
            
            // Decrypt the last message content if it exists
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };
                } catch (error) {
                    console.error('Error decrypting message in handleLastMessageUpdate:', error);
                }
            }

            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        const currentUnreadCount = conv.unreadCount || 0;
                        const newUnreadCount = data.isIncrement 
                            ? currentUnreadCount + (data.unreadCount || 1)
                            : (data.unreadCount || currentUnreadCount);

                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: lastMessage
                            },
                            unreadCount: newUnreadCount
                        };
                    }
                    return conv;
                });
            });
        };

        // Đăng ký các listeners với hàm xử lý riêng biệt
        socket.on('message:new', handleNewMessage);
        socket.on('chat:update', handleChatUpdate);
        socket.on('group:removed', handleRemoveMembers);
        socket.on('group:left', handleRemoveMembers);
        socket.on('group:added', handleGroupAdded);
        socket.on('conversation:update', async (data) => {
            // Decrypt the last message content and attachments if they exist
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };

                    // Decrypt attachment filenames if present
                    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
                        const decryptedAttachments = await Promise.all(
                            lastMessage.attachments.map(async (attachment) => ({
                                ...attachment,
                                fileName: await clientEncryptionService.decryptMessage(attachment.fileName, data.conversationId)
                            }))
                        );
                        lastMessage = {
                            ...lastMessage,
                            attachments: decryptedAttachments
                        };
                    }
                } catch (error) {
                    console.error('Error decrypting message in conversation:update:', error);
                }
            }

            setConversations(prev => {
                return prev.map(conv => {
                    const convId = conv.conversationInfo?._id?.toString();
                    const dataId = data.conversationId.toString();

                    if (convId === dataId) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: lastMessage
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
            const { conversationId, readBy } = data;
            // console.log('Received conversation:read data:', data);
            setConversations(prev =>
                prev.map(conv =>
                    conv.conversationInfo._id?.toString() === conversationId.toString()
                        ? {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: conv.conversationInfo.lastMessage
                                    ? {
                                        ...conv.conversationInfo.lastMessage,
                                        readBy: readBy || conv.conversationInfo.lastMessage.readBy
                                    } : null
                            }
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
        }        // Đăng ký listener cho message:recall-success
        socket.on('message:recall-success', handleRecallMessage);
        // Listen for chat:loaded events to sync activeConv state when conversations are loaded externally
        socket.on('chat:loaded', (data) => {
            if (data && data.conversation) {
                console.log('ConversationList: Syncing activeConv from external chat:loaded:', data.conversation._id);
                setActiveConv(data.conversation);
                setSelectedConversationId(data.conversation._id);

                // Update the current chat in the main Chat component
                setCurrentChat(data.conversation);

                // Handle socket events for permanent conversations
                if (!data.isTemporary) {
                    socket.emit('conversation:mark-read', {
                        conversationId: data.conversation._id
                    });
                    console.log(`ConversationList: Entering conversation: ${data.conversation._id}`);
                    socket.emit('conversation:enter', {
                        conversationId: data.conversation._id,
                    });
                } else {
                    console.log('ConversationList: Skipping socket emissions for temporary conversation:', data.conversation._id);
                }
            }
        });

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
        })        // Cleanup function
        return () => {
            // console.log('Cleaning up socket listeners in ConversationList');
            socket.off('message:recall-success');
            socket.off('chat:loaded');
            socket.off('chat:new', handleChatNew);
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
            socket.off('user:status', handleUserStatus);
            socket.off('user:status-bulk', handleBulkStatus);
            clearInterval(statusInterval);
        };
    }, [socket, user, setCurrentChat, getUserStatus, refreshUserStatus]); // Thêm user._id vào dependency array
    useEffect(() => {
        if (!socket) return; const handlePinSuccess = async (data) => {
            console.log('Message pinned in ConversationList:', data);

            // Decrypt the last message content if it exists
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };
                } catch (error) {
                    console.error('Error decrypting message in handlePinSuccess:', error);
                }
            }

            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        let newUnreadCount = conv.unreadCount || 0;

                        if (data.actor && data.actor._id !== user._id) {
                            if (data.isIncrement) {
                                newUnreadCount += 1;
                            }
                            newUnreadCount = data.unreadCount || newUnreadCount;
                        }
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: lastMessage
                            },
                            unreadCount: newUnreadCount,
                        };
                    }
                    return conv;
                });
            });
        }; const handleUnPinSuccess = async (data) => {
            console.log('Message unpinned in ConversationList:', data);

            // Decrypt the last message content if it exists
            let lastMessage = data.lastMessage;
            if (lastMessage && lastMessage.content) {
                try {
                    lastMessage = {
                        ...lastMessage,
                        content: await clientEncryptionService.decryptMessage(lastMessage.content, data.conversationId)
                    };
                } catch (error) {
                    console.error('Error decrypting message in handleUnPinSuccess:', error);
                }
            }

            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        let newUnreadCount = conv.unreadCount || 0;

                        if (data.actor && data.actor._id !== user._id) {
                            if (data.isIncrement) {
                                newUnreadCount += 1;
                            }
                            newUnreadCount = data.unreadCount || newUnreadCount;
                        }
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                lastMessage: lastMessage
                            },
                            unreadCount: newUnreadCount,
                        };
                    }
                    return conv;
                });
            });
        }

        const handlePinConversation = (data) => {
            console.log('Received pin conversation event:', data);
            setConversations(prev => {
                return prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        return {
                            ...conv,
                            pinned: true,
                        };
                    }
                    return conv;
                });
            });
        };



        socket.on('message:pin-success', handlePinSuccess);
        socket.on('message:unpin-success', handleUnPinSuccess);
        socket.on('conversation:pin-success', handlePinConversation);
        return () => {
            socket.off('message:pin-success', handlePinSuccess);
            socket.off('message:unpin-success', handleUnPinSuccess);
            socket.off('conversation:pin-success', handlePinConversation);
        };
    }, [socket, conversations]);
    const fetchConversations = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/conversation/user/${user._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                // Decrypt lastMessage content for all conversations
                const decryptedConversations = await Promise.all(
                    response.data.data.map(async (conversation) => {
                        if (conversation.conversationInfo?.lastMessage?.content) {
                            try {
                                const decryptedContent = await clientEncryptionService.decryptMessage(
                                    conversation.conversationInfo.lastMessage.content,
                                    conversation.conversationInfo._id
                                );

                                let decryptedAttachments = conversation.conversationInfo.lastMessage.attachments;

                                // Decrypt attachment filenames if present
                                if (conversation.conversationInfo.lastMessage.attachments &&
                                    conversation.conversationInfo.lastMessage.attachments.length > 0) {
                                    decryptedAttachments = await Promise.all(
                                        conversation.conversationInfo.lastMessage.attachments.map(async (attachment) => ({
                                            ...attachment,
                                            fileName: await clientEncryptionService.decryptMessage(
                                                attachment.fileName,
                                                conversation.conversationInfo._id
                                            )
                                        }))
                                    );
                                }

                                return {
                                    ...conversation,
                                    conversationInfo: {
                                        ...conversation.conversationInfo,
                                        lastMessage: {
                                            ...conversation.conversationInfo.lastMessage,
                                            content: decryptedContent,
                                            attachments: decryptedAttachments
                                        }
                                    }
                                };
                            } catch (error) {
                                console.error('Error decrypting lastMessage in fetchConversations:', error);
                                return conversation; // Return original if decryption fails
                            }
                        }
                        return conversation;
                    })
                );

                setConversations(decryptedConversations);
                // console.log('Conversations with decrypted lastMessages:', decryptedConversations);
            }
        } catch (error) {
            console.log(error);
        }
    }
    useEffect(() => {
        if (socket && socket.connected) {
            refreshUserStatus();
        }
        fetchConversations();
    }, [socket, user._id]);

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
        if (!sentAt) return "";

        const date = new Date(sentAt);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays === 1) {
            return "Yesterday";
        } else if (diffInDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        // const hours = date.getHours();
        // const minutes = date.getMinutes();
        // const ampm = hours >= 12 ? "PM" : "AM";
        // return `${hours % 12}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
    };
    const handleConversationClick = (conversation) => {
        // console.log('Clicked conversation:', conversation);
        setSelectedConversationId(conversation._id);

        // Leave previous conversation if exists
        if (activeConv && !activeConv.isTemporary) {
            socket.emit('conversation:leave', {
                conversationId: activeConv._id
            });
        }

        console.log(`Joining room: ${conversation._id}`);

        // Update unread count and mark as read
        setConversations(prev =>
            prev.map(conv =>
                conv.conversationInfo._id === conversation._id
                    ? {
                        ...conv,
                        unreadCount: 0, // Reset unread count
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
        // console.log('Setting current chat:', conversation);

        // Emit chat:init - the existing chat:loaded listeners will handle the response
        socket.emit('chat:init', {
            contactId: conversation._id,
            conversationType: conversation.type,
            conversationInfo: conversation
        });
    }

    const renderLastMessage = (msg, conversationType) => {
        if (!msg) return null;
        // console.log('Metadata:', msg.metadata);
        const { action, department, changedBy, userChange } = msg.metadata || {};
        if (action === 'header_assigned') {
            if (user._id === userChange?._id) {
                return `You were admin in group ${department.name} department`;
            }
            return `${userChange?.name} is an admin in group ${department.name} department`;
        }
        if (action === 'deputy_assigned') {
            if (user._id === userChange._id) {
                return `You were assigned as Deputy of ${department.name}`;
            }
            if (changedBy && changedBy._id === userChange._id) {
                return `You assigned ${userChange.name} as Deputy Department`;
            }
            return `${changedBy?.name || 'Someone'} assigned ${userChange.name} as Deputy Department`;
        }
        if (action === 'header_removed') {
            if (user._id === userChange._id) {
                return `You were removed from Department Head position in ${department.name}`;
            }
            if (changedBy && changedBy._id === userChange._id) {
                return `You removed ${user.name} from Department Head position`;
            }
            return `${changedBy?.name || 'Someone'} removed ${userChange.name} from Department Head position`;
        }

        if (action === 'deputy_removed') {
            if (user._id === userChange._id) {
                return `You were removed from Deputy position in ${department.name}`;
            }
            if (changedBy && changedBy._id === userChange._id) {
                return `You removed ${userChange.name} from Deputy position`;
            }
            return `${changedBy?.name || 'Someone'} removed ${userChange.name} from Deputy position`;
        }
        if (msg.metadata?.action === 'message_pinned') {
            if (msg.metadata.pinnedBy._id === user._id) {
                return <span className="italic text-neutral-400 flex items-center"><TbPinnedFilled /> You pinned  message</span>
            } else {
                return (
                    <div className="flex items-center gap-1 text-neutral-400">
                        <TbPinnedFilled className="flex-shrink-0" />
                        <p className="italic">{msg.metadata.pinnedBy.name} pinned  message</p>
                    </div>
                )
            }
        }
        if (msg.metadata?.action === 'message_unpinned') {
            if (msg.metadata.pinnedBy._id === user._id) {
                return <span className="italic text-neutral-400 flex items-center"><TbPin /> You unpinned  message</span>
            } else {
                return (
                    <div className="flex items-center gap-1 text-neutral-400">
                        <TbPin className="flex-shrink-0" />
                        <p className="italic">{msg.metadata.pinnedBy.name} unpinned  message</p>
                    </div>
                )
            }
        }
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

            return `${removedBy.name || changedBy?.name} removed ${memberNames || userChange?.name}`;
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
        const isSender = msg.sender._id === user._id || msg.sender === user._id || null;

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

    const handlePinClick = (conversationId, e) => {
        e.stopPropagation();
        e.preventDefault(); // Add this to be extra safe
        const currentDotRef = dotsRefs.current[activeChat];
        const currentPosition = {
            top: currentDotRef?.getBoundingClientRect().top || 0,
            left: (currentDotRef?.getBoundingClientRect().right || 0) + 5
        };

        // Store this position in a ref or state
        setMenuPosition(currentPosition);
        if (socket) {
            socket.emit('pin:conversation', { conversationId });
        }
        setActiveChat(null);

    }

    const handleArchiveClick = async (conversationId, e) => {
        e.stopPropagation();

        setActiveChat(null);

        try {
            const response = await axios.post(`http://localhost:5000/api/conversation/archive`, {
                conversationId
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                fetchConversations();

                if (selectedConversationId === conversationId) {
                    setSelectedConversationId(null);
                    setCurrentChat(null);
                }
            }
        } catch (error) {
            console.error('Error archiving conversation:', error);
        }
    }

    useEffect(() => {
        if (!socket) return;

        const handlePinConvSuccess = (data) => {
            setConversations(prev => {
                const updatedConvs = prev.map(conv => {
                    if (conv.conversationInfo._id.toString() === data.conversationId.toString()) {
                        return {
                            ...conv,
                            conversationInfo: {
                                ...conv.conversationInfo,
                                pinned: data.isPinned
                            }
                        }
                    }
                    return conv;
                });
                return sortConv(updatedConvs);
            })
        }

        socket.on('conversation:pin-success', handlePinConvSuccess);
        return () => {
            socket.off('conversation:pin-success', handlePinConvSuccess);
        }
    }, [socket, user._id]);

    const sortConv = (convs) => {
        return [...convs].sort((a, b) => {
            if (a.conversationInfo.pinned && !b.conversationInfo.pinned) return -1;
            if (!a.conversationInfo.pinned && b.conversationInfo.pinned) return 1;

            const aTime = a.conversationInfo.lastMessage?.sentAt || a.conversationInfo.createdAt;
            const bTime = b.conversationInfo.lastMessage?.sentAt || b.conversationInfo.createdAt;
            return new Date(bTime) - new Date(aTime);
        });
    };

    const searchConversation = (query) => {
        setSearchQuery(query);
    }

    const filteredConversations = conversations.filter(chat => {
        if (!searchQuery) return true;

        if (chat.conversationInfo.type === 'private') {
            const other = chat.conversationInfo.members.find(member => member._id !== user._id);
            return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
            return chat.conversationInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) || chat.conversationInfo.members.some(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
    })

    const filteredConversationArchive = conversations.filter(chat => {
        const isArchived = chat.conversationInfo?.archived;
        return (activeTab === "all" && !isArchived) || (activeTab === "archived" && isArchived);
    })
    // console.log('Filtered conversations:', filteredConversationArchive);
    const channelConversations = filteredConversationArchive.filter(chat => chat.conversationInfo?.type === 'department' && !chat.conversationInfo?.archived);
    const groupConversations = filteredConversationArchive.filter(chat => chat.conversationInfo?.type === 'group' && !chat.conversationInfo?.archived);
    const channelConversationsUnArchived = filteredConversationArchive.filter(chat => chat.conversationInfo?.type === 'department' && chat.conversationInfo?.archived);
    const groupConversationsUnArchived = filteredConversationArchive.filter(chat => chat.conversationInfo?.type === 'group' && chat.conversationInfo?.archived);

    const searchResults = searchQuery ? filteredConversations : [];

    return (
        <div className="p-6 w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 dark:text-white shadow-2xl border-none backdrop-blur-sm">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                    <div className="relative">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 w-3 h-8 rounded-full inline-block shadow-lg"></span>
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 w-3 h-8 rounded-full inline-block animate-pulse opacity-75"></span>
                    </div>
                    Chats
                </h1>
            </div>
            <div className="mt-5 flex items-center relative">
                <div className="absolute flex items-center dark:text-white dark:hover:text-gray-500 ml-2">
                    <CiSearch className="text-gray-400 text-3xl hover:bg-neutral-600 p-1 rounded-full transition-colors duration-200" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-2 rounded-3xl w-full border border-gray-300 dark:border-neutral-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => searchConversation(e.target.value)}
                />
                {searchQuery && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto scrollbar-none">
                        {searchResults.map(chat => {
                            if (chat.conversationInfo.type === 'private') {
                                const otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                                return (
                                    <div
                                        key={chat.conversationInfo._id}
                                        className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer rounded-md m-1"
                                        onClick={() => {
                                            handleConversationClick(chat.conversationInfo);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <img
                                            src={otherUser?.avatar || 'https://via.placeholder.com/40'}
                                            alt={otherUser?.name}
                                            className="w-8 h-8 rounded-full mr-3"
                                        />
                                        <span className="dark:text-white">{otherUser?.name}</span>
                                    </div>
                                );
                            } else {
                                return (
                                    <div
                                        key={chat.conversationInfo._id}
                                        className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer rounded-md m-1"
                                        onClick={() => {
                                            handleConversationClick(chat.conversationInfo);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-20 text-purple-400 font-bold mr-3">
                                            {chat.conversationInfo.name.charAt(0) + chat.conversationInfo.name.charAt(1)}
                                        </div>
                                        <span className="dark:text-white">{chat.conversationInfo.name}</span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}
            </div>             {/* start private conversation  */}
            <div className="mt-6">
                {conversations.filter(conv => conv.conversationInfo?.type === 'private').length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {conversations
                            .filter(conv => conv.conversationInfo.type === 'private')
                            .map((chat) => {
                                let otherUser = null;
                                if (chat.conversationInfo.type === 'private') {
                                    otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                                }
                                const currentStatus = otherUser ? getUserStatus(otherUser._id) : 'offline';
                                const isSelected = selectedConversationId === chat.conversationInfo._id;

                                return (
                                    <div
                                        key={chat.conversationInfo._id}
                                        className={`relative cursor-pointer p-4 transition-all duration-200 transform hover:scale-105 flex-shrink-0
                                            ${isSelected ? 'scale-105' : ''}`}
                                        onClick={() => handleConversationClick(chat.conversationInfo)}
                                    >
                                        <div className={`absolute bottom-0 left-0 w-full h-3/4 rounded-lg shadow-md 
                                            ${isSelected
                                                ? 'dark:bg-neutral-700 bg-gray-300 border-2 border-gray-400 dark:border-gray-600'
                                                : 'dark:bg-neutral-800 bg-neutral-200'}`}>
                                        </div>

                                        <div className="relative flex flex-col items-center">
                                            <div className="relative mb-2">
                                                <img
                                                    src={otherUser?.avatar || 'https://via.placeholder.com/40'}
                                                    alt={otherUser?.name}
                                                    className={`w-12 h-12 rounded-full z-10 shadow-lg border-2 
                                                        ${isSelected
                                                            ? 'border-blue-400 dark:border-blue-600'
                                                            : 'border-white dark:border-neutral-800'}`}
                                                />
                                                {currentStatus === "online" ? (
                                                    <div className="w-3 h-3 bg-green-500 rounded-full absolute top-8 right-0 z-20 ring-2 ring-white dark:ring-neutral-800"></div>
                                                ) : (
                                                    <div className="w-3 h-3 bg-gray-500 rounded-full absolute top-8 right-0 z-20 ring-2 ring-white dark:ring-neutral-800"></div>
                                                )}
                                            </div>
                                            <div className={`font-semibold text-sm text-center mt-1 z-10 max-w-20 truncate
                                                ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}
                                                title={otherUser?.name}>
                                                {otherUser?.name}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="flex items-center w-full justify-center h-20 dark:text-white">
                        <p className="text-center opacity-70">Let's start chatting</p>
                    </div>
                )}

            </div>
            {/* end private conversation  */}
            <div className="flex justify-between items-center mt-6 mb-2">
                <h1
                    onClick={() => setActiveTab('all')}
                    className={`text-center w-full font-semibold rounded-full py-1 cursor-pointer transition-colors ${activeTab === "all"
                        ? "bg-neutral-600 text-white"
                        : "bg-neutral-300 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                        }`}
                >
                    All ({conversations.filter(chat => !chat.conversationInfo?.archived).length})
                </h1>
                <h1
                    onClick={() => setActiveTab("archived")}
                    className={`w-full text-center font-semibold rounded-full py-1 cursor-pointer transition-colors ${activeTab === "archived"
                        ? "bg-neutral-600 text-white"
                        : "bg-neutral-300 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                        }`}
                >
                    Archived ({conversations.filter(chat => chat.conversationInfo?.archived).length})
                </h1>
            </div>
            {activeTab === "all" ? (
                <div className="overflow-y-auto scrollbar-none mt-6 max-h-[600px]">
                    <div className="mb-2">
                        {channelConversations.length > 0 && (
                            <h1 className="font-semibold text-gray-800 dark:text-white flex items-center">
                                <span className="bg-purple-500 w-2 h-5 rounded-full inline-block mr-2"></span>
                                Channels
                            </h1>
                        )}
                        <div className="max-h-[300px] overflow-y-auto scrollbar-none mt-4">
                            {channelConversations
                                .filter(chat =>
                                    chat.conversationInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((chat) => {
                                    const isSelected = selectedConversationId === chat.conversationInfo._id;
                                    return (
                                        <div
                                            key={chat.conversationInfo._id}
                                            className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                            ${isSelected
                                                    ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                    : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                            onClick={() => handleConversationClick(chat.conversationInfo)}
                                        >
                                            <div className="items-center w-full grid grid-cols-5">
                                                <div className="relative mr-3 col-span-1">
                                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                    bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                    ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}>
                                                        {chat.conversationInfo.name.charAt(0) + chat.conversationInfo.name.charAt(1)}
                                                    </div>
                                                </div>
                                                <div className="w-[190px] col-span-3">
                                                    <div className={`font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                                                        {chat.conversationInfo.type === 'department' ? `#${chat.conversationInfo.name}` : `${chat.conversationInfo.name}`}
                                                    </div>
                                                    {chat.conversationInfo?.lastMessage?.type === 'system' ? (
                                                        <div className={`text-sm ${chat.unreadCount > 0 ? 'font-bold dark:text-white' : 'text-neutral-500'}`}>
                                                            {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                        </div>
                                                    ) : (
                                                        <div className={`text-sm flex truncate 
                                                        ${chat.unreadCount > 0
                                                                ? "font-bold text-black dark:text-white"
                                                                : "text-neutral-500"}`}>
                                                            {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col space-y-2 col-span-1">
                                                    <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt || chat.conversationInfo.updatedAt)}</div>
                                                    <div className="flex justify-end">
                                                        {chat.unreadCount > 0 && (
                                                            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse text-end w-fit z-10">
                                                                {chat.unreadCount}
                                                            </div>
                                                        )}
                                                        <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                            {chat.conversationInfo.pinned ? (
                                                                <TbPinnedFilled className="dark:text-white text-black" />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`absolute right-2 top-3 dark:bg-neutral-700 bg-gray-200 p-1 rounded-full 
                                                    ${activeChat === chat.conversationInfo._id ? "block" : "hidden group-hover:block"}`}
                                                    >
                                                        <BsThreeDots
                                                            ref={(el) => (dotsRefs.current[chat.conversationInfo._id] = el)}
                                                            className="w-3 h-3 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // If opening the menu, capture exact coordinates
                                                                if (activeChat !== chat.conversationInfo._id) {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.top,
                                                                        left: rect.right + 5
                                                                    });
                                                                } else {
                                                                    setMenuPosition(null);
                                                                }

                                                                setActiveChat(activeChat === chat.conversationInfo._id ? null : chat.conversationInfo._id);
                                                            }}
                                                        />
                                                        <MenuPortal isOpen={activeChat === chat.conversationInfo._id}>
                                                            <div
                                                                ref={(el) => (menuRefs.current[chat.conversationInfo._id] = el)}
                                                                className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-black dark:text-white"
                                                                style={{
                                                                    top: menuPosition?.top || 0,
                                                                    left: menuPosition?.left || 0,
                                                                }}
                                                            >
                                                                <div
                                                                    onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    {chat.conversationInfo.pinned ? (
                                                                        <>
                                                                            <TbPinnedFilled className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Unpin</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TbPinned className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Pin</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    <GoArchive className="text-sm" />
                                                                    <p className="">
                                                                        {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                    </p>
                                                                </div>
                                                                <div className="hover:bg-red-200 dark:hover:bg-red-900 p-2 rounded cursor-pointer text-red-600 dark:text-red-400 grid grid-cols-3 items-center">
                                                                    <TiDeleteOutline className="text-sm" />
                                                                    <p>Delete</p>
                                                                </div>
                                                            </div>
                                                        </MenuPortal>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h1 className="font-semibold text-gray-800 dark:text-white flex items-center mb-5">
                            <span className="bg-purple-500 w-2 h-5 rounded-full inline-block mr-2"></span>
                            Groups
                        </h1>

                        <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                            {groupConversations.length > 0 ? (
                                groupConversations
                                    .filter(chat =>
                                        chat.conversationInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((chat) => {
                                        const isSelected = selectedConversationId === chat.conversationInfo._id;
                                        return (
                                            <div
                                                key={chat.conversationInfo._id}
                                                className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                                ${isSelected
                                                        ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                        : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                                onClick={() => handleConversationClick(chat.conversationInfo)}
                                            >
                                                <div className="items-center w-full grid grid-cols-5">
                                                    <div className="relative mr-3 col-span-1">
                                                        <img
                                                            src={chat.conversationInfo.avatarGroup || 'https://via.placeholder.com/40'}
                                                            alt={chat.conversationInfo.name}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                            bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                            ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="w-[190px] col-span-3">
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
                                                    <div className="space-y-2 col-span-1">
                                                        <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt)}</div>
                                                        <div className="flex justify-end">
                                                            {chat.unreadCount > 0 && (
                                                                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse w-fit z-10">
                                                                    {chat.unreadCount}
                                                                </div>
                                                            )}
                                                            <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                                {chat.conversationInfo.pinned ? (
                                                                    <TbPinnedFilled className="dark:text-white text-black" />
                                                                ) : null}
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

                                                                    // If opening the menu, capture exact coordinates
                                                                    if (activeChat !== chat._id) {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setMenuPosition({
                                                                            top: rect.top,
                                                                            left: rect.right + 5
                                                                        });
                                                                    } else {
                                                                        setMenuPosition(null);
                                                                    }

                                                                    setActiveChat(activeChat === chat._id ? null : chat._id);
                                                                }}
                                                            />
                                                            <MenuPortal isOpen={activeChat === chat._id}>
                                                                <div
                                                                    ref={(el) => (menuRefs.current[chat._id] = el)}
                                                                    className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-white"
                                                                    style={{
                                                                        top: menuPosition?.top || 0,
                                                                        left: menuPosition?.left || 0,
                                                                    }}
                                                                >
                                                                    <div
                                                                        onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        {chat.conversationInfo.pinned ? (
                                                                            <>
                                                                                <TbPinnedFilled className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Unpin</p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <TbPinned className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Pin</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        <GoArchive className="text-sm" />
                                                                        <p className="">
                                                                            {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                        </p>
                                                                    </div>
                                                                    <div className="hover:bg-red-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer text-red-600 grid grid-cols-3 items-center">
                                                                        <TiDeleteOutline className="text-sm" />
                                                                        <p>Delete</p>
                                                                    </div>
                                                                </div>
                                                            </MenuPortal>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                            ) : (
                                <div className="flex items-center w-full justify-center h-20 ">
                                    <p className="text-center">Let's start create group in Sidebar 😊</p>
                                </div>
                            )
                            }
                        </div>
                    </div>
                    <div className="mt-4">
                        <h1 className="font-semibold text-gray-800 dark:text-white flex items-center mb-5">
                            <span className="bg-purple-500 w-2 h-5 rounded-full inline-block mr-2"></span>
                            Recent
                        </h1>
                        <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                            {conversations.filter(conv => conv.conversationInfo?.type === 'private' && !conv.conversationInfo?.archived).length > 0 ? (
                                conversations.map((chat) => {
                                    let otherUser = null;
                                    if (chat.conversationInfo.type === 'private') {
                                        otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                                    }
                                    const currentStatus = otherUser ? getUserStatus(otherUser._id) : 'offline';
                                    const isSelected = selectedConversationId === chat.conversationInfo._id;
                                    return (
                                        <React.Fragment key={chat._id}>
                                            {chat.conversationInfo.type === 'private' && (
                                                <div
                                                    key={chat.conversationInfo._id}
                                                    className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                                ${isSelected
                                                            ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                            : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                                    onClick={() => handleConversationClick(chat.conversationInfo)}
                                                >
                                                    <div className="flex items-center w-full justify-between">
                                                        <div className="relative mr-3">
                                                            <img
                                                                src={otherUser?.avatar}
                                                                className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                                bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                                ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                                                            />
                                                            {currentStatus === "online" ? (
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
                                                                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse w-fit z-10">
                                                                    {chat.unreadCount}
                                                                </div>
                                                            )}
                                                            <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                                {chat.conversationInfo.pinned ? (
                                                                    <TbPinnedFilled className="dark:text-white text-black" />
                                                                ) : null}
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

                                                                    // If opening the menu, capture exact coordinates
                                                                    if (activeChat !== chat._id) {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setMenuPosition({
                                                                            top: rect.top,
                                                                            left: rect.right + 5
                                                                        });
                                                                    } else {
                                                                        setMenuPosition(null);
                                                                    }

                                                                    setActiveChat(activeChat === chat._id ? null : chat._id);
                                                                }}
                                                            />
                                                            <MenuPortal isOpen={activeChat === chat._id}>
                                                                <div
                                                                    ref={(el) => (menuRefs.current[chat._id] = el)}
                                                                    className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-white"
                                                                    style={{
                                                                        top: menuPosition?.top || 0,
                                                                        left: menuPosition?.left || 0,
                                                                    }}
                                                                >
                                                                    <div
                                                                        onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        {chat.conversationInfo.pinned ? (
                                                                            <>
                                                                                <TbPinnedFilled className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Unpin</p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <TbPinned className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Pin</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        <GoArchive className="text-sm" />
                                                                        <p className="">
                                                                            {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                        </p>
                                                                    </div>
                                                                    <div className="hover:bg-red-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer text-red-600 grid grid-cols-3 items-center">
                                                                        <TiDeleteOutline className="text-sm" />
                                                                        <p>Delete</p>
                                                                    </div>
                                                                </div>
                                                            </MenuPortal>
                                                        </div>
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
            ) : (
                <div className="overflow-y-auto scrollbar-none mt-6 max-h-[600px]">
                    <div className="mb-2">
                        <div className="max-h-[300px] overflow-y-auto scrollbar-none mt-4">
                            {channelConversationsUnArchived
                                .filter(chat =>
                                    chat.conversationInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((chat) => {
                                    const isSelected = selectedConversationId === chat.conversationInfo._id;
                                    return (
                                        <div
                                            key={chat.conversationInfo._id}
                                            className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                        ${isSelected
                                                    ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                    : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                            onClick={() => handleConversationClick(chat.conversationInfo)}
                                        >
                                            <div className="items-center w-full grid grid-cols-5">
                                                <div className="relative mr-3 col-span-1">
                                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}>
                                                        {chat.conversationInfo.name.charAt(0) + chat.conversationInfo.name.charAt(1)}
                                                    </div>
                                                </div>
                                                <div className="w-[190px] col-span-3">
                                                    <div className={`font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                                                        {chat.conversationInfo.type === 'department' ? `#${chat.conversationInfo.name}` : `${chat.conversationInfo.name}`}
                                                    </div>
                                                    {chat.conversationInfo?.lastMessage?.type === 'system' ? (
                                                        <div className={`text-sm ${chat.unreadCount > 0 ? 'font-bold dark:text-white' : 'text-neutral-500'}`}>
                                                            {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                        </div>
                                                    ) : (
                                                        <div className={`text-sm flex truncate 
                                                    ${chat.unreadCount > 0
                                                                ? "font-bold text-black dark:text-white"
                                                                : "text-neutral-500"}`}>
                                                            {renderLastMessage(chat.conversationInfo.lastMessage, chat.conversationInfo.type)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col space-y-2 col-span-1">
                                                    <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt || chat.conversationInfo.updatedAt)}</div>
                                                    <div className="flex justify-between">
                                                        {chat.unreadCount > 0 && (
                                                            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse w-fit z-10">
                                                                {chat.unreadCount}
                                                            </div>
                                                        )}
                                                        <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                            {chat.conversationInfo.pinned ? (
                                                                <TbPinnedFilled className="dark:text-white text-black" />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`absolute right-2 top-3 dark:bg-neutral-700 bg-gray-200 p-1 rounded-full 
                                                ${activeChat === chat.conversationInfo._id ? "block" : "hidden group-hover:block"}`}
                                                    >
                                                        <BsThreeDots
                                                            ref={(el) => (dotsRefs.current[chat.conversationInfo._id] = el)}
                                                            className="w-3 h-3 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // If opening the menu, capture exact coordinates
                                                                if (activeChat !== chat.conversationInfo._id) {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.top,
                                                                        left: rect.right + 5
                                                                    });
                                                                } else {
                                                                    setMenuPosition(null);
                                                                }

                                                                setActiveChat(activeChat === chat.conversationInfo._id ? null : chat.conversationInfo._id);
                                                            }}
                                                        />
                                                        <MenuPortal isOpen={activeChat === chat.conversationInfo._id}>
                                                            <div
                                                                ref={(el) => (menuRefs.current[chat.conversationInfo._id] = el)}
                                                                className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-black dark:text-white"
                                                                style={{
                                                                    top: menuPosition?.top || 0,
                                                                    left: menuPosition?.left || 0,
                                                                }}
                                                            >
                                                                <div
                                                                    onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    {chat.conversationInfo.pinned ? (
                                                                        <>
                                                                            <TbPinnedFilled className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Unpin</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TbPinned className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Pin</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    <GoArchive className="text-sm" />
                                                                    <p className="">
                                                                        {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                    </p>
                                                                </div>
                                                                <div className="hover:bg-red-200 dark:hover:bg-red-900 p-2 rounded cursor-pointer text-red-600 dark:text-red-400 grid grid-cols-3 items-center">
                                                                    <TiDeleteOutline className="text-sm" />
                                                                    <p>Delete</p>
                                                                </div>
                                                            </div>
                                                        </MenuPortal>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                            {groupConversationsUnArchived
                                .filter(chat =>
                                    chat.conversationInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((chat) => {
                                    const isSelected = selectedConversationId === chat.conversationInfo._id;
                                    return (
                                        <div
                                            key={chat.conversationInfo._id}
                                            className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                            ${isSelected
                                                    ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                    : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                            onClick={() => handleConversationClick(chat.conversationInfo)}
                                        >
                                            <div className="items-center w-full grid grid-cols-5">
                                                <div className="relative mr-3 col-span-1">
                                                    <img
                                                        src={chat.conversationInfo.avatarGroup || 'https://via.placeholder.com/40'}
                                                        alt={chat.conversationInfo.name}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                        bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                        ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                                                    />
                                                </div>
                                                <div className="w-[190px] col-span-3">
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
                                                <div className="space-y-2 col-span-1">
                                                    <div className="text-xs text-gray-500 text-right">{formatSentAt(chat.conversationInfo.lastMessage?.sentAt)}</div>
                                                    <div className="flex justify-end">
                                                        {chat.unreadCount > 0 && (
                                                            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse w-fit z-10">
                                                                {chat.unreadCount}
                                                            </div>
                                                        )}
                                                        <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                            {chat.conversationInfo.pinned ? (
                                                                <TbPinnedFilled className="dark:text-white text-black" />
                                                            ) : null}
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

                                                                // If opening the menu, capture exact coordinates
                                                                if (activeChat !== chat._id) {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.top,
                                                                        left: rect.right + 5
                                                                    });
                                                                } else {
                                                                    setMenuPosition(null);
                                                                }

                                                                setActiveChat(activeChat === chat._id ? null : chat._id);
                                                            }}
                                                        />
                                                        <MenuPortal isOpen={activeChat === chat._id}>
                                                            <div
                                                                ref={(el) => (menuRefs.current[chat._id] = el)}
                                                                className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-white"
                                                                style={{
                                                                    top: menuPosition?.top || 0,
                                                                    left: menuPosition?.left || 0,
                                                                }}
                                                            >
                                                                <div
                                                                    onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    {chat.conversationInfo.pinned ? (
                                                                        <>
                                                                            <TbPinnedFilled className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Unpin</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TbPinned className="text-sm col-span-1" />
                                                                            <p className="col-span-2">Pin</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                >
                                                                    <GoArchive className="text-sm" />
                                                                    <p className="">
                                                                        {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                    </p>
                                                                </div>
                                                                <div className="hover:bg-red-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer text-red-600 grid grid-cols-3 items-center">
                                                                    <TiDeleteOutline className="text-sm" />
                                                                    <p>Delete</p>
                                                                </div>
                                                            </div>
                                                        </MenuPortal>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="max-h-[300px] overflow-y-auto scrollbar-none">
                            {conversations.filter(conv => conv.conversationInfo.type === 'private' && conv.conversationInfo.archived).length > 0 && (
                                conversations.map((chat) => {
                                    let otherUser = null;
                                    if (chat.conversationInfo.type === 'private') {
                                        otherUser = chat.conversationInfo.members.find(member => member._id !== user._id);
                                    }
                                    const currentStatus = otherUser ? getUserStatus(otherUser._id) : 'offline';
                                    const isSelected = selectedConversationId === chat.conversationInfo._id;
                                    return (
                                        <React.Fragment key={chat._id}>
                                            {chat.conversationInfo.type === 'private' && (
                                                <div
                                                    key={chat.conversationInfo._id}
                                                    className={`p-3 rounded-lg cursor-pointer mb-3 relative group transition duration-200 
                                            ${isSelected
                                                            ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 shadow-md'
                                                            : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                                                    onClick={() => handleConversationClick(chat.conversationInfo)}
                                                >
                                                    <div className="flex items-center w-full justify-between">
                                                        <div className="relative mr-3">
                                                            <img
                                                                src={otherUser?.avatar}
                                                                className={`w-10 h-10 flex items-center justify-center rounded-full 
                                                            bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg 
                                                            ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                                                            />
                                                            {currentStatus === "online" ? (
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
                                                                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse w-fit z-10">
                                                                    {chat.unreadCount}
                                                                </div>
                                                            )}
                                                            <div className="ml-2" onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}>
                                                                {chat.conversationInfo.pinned ? (
                                                                    <TbPinnedFilled className="dark:text-white text-black" />
                                                                ) : null}
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

                                                                    // If opening the menu, capture exact coordinates
                                                                    if (activeChat !== chat._id) {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setMenuPosition({
                                                                            top: rect.top,
                                                                            left: rect.right + 5
                                                                        });
                                                                    } else {
                                                                        setMenuPosition(null);
                                                                    }

                                                                    setActiveChat(activeChat === chat._id ? null : chat._id);
                                                                }}
                                                            />
                                                            <MenuPortal isOpen={activeChat === chat._id}>
                                                                <div
                                                                    ref={(el) => (menuRefs.current[chat._id] = el)}
                                                                    className="fixed bg-white dark:bg-neutral-800 shadow-lg rounded-md w-32 p-2 text-sm z-[9999] text-white"
                                                                    style={{
                                                                        top: menuPosition?.top || 0,
                                                                        left: menuPosition?.left || 0,
                                                                    }}
                                                                >
                                                                    <div
                                                                        onClick={(e) => handlePinClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        {chat.conversationInfo.pinned ? (
                                                                            <>
                                                                                <TbPinnedFilled className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Unpin</p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <TbPinned className="text-sm col-span-1" />
                                                                                <p className="col-span-2">Pin</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        onClick={(e) => handleArchiveClick(chat.conversationInfo._id, e)}
                                                                        className="hover:bg-gray-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer grid grid-cols-3 items-center"
                                                                    >
                                                                        <GoArchive className="text-sm" />
                                                                        <p className="">
                                                                            {chat.conversationInfo.archived ? "Unarchive" : "Archive"}
                                                                        </p>
                                                                    </div>
                                                                    <div className="hover:bg-red-200 dark:hover:bg-neutral-700 p-2 rounded cursor-pointer text-red-600 grid grid-cols-3 items-center">
                                                                        <TiDeleteOutline className="text-sm" />
                                                                        <p>Delete</p>
                                                                    </div>
                                                                </div>
                                                            </MenuPortal>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default ConversationList;