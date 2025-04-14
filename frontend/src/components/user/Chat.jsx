import ConversationList from "./ConversationList";
import Groups from "./Groups";
import Contacts from "./Contacts";
import Profile from "./Profile";
import { MdAdd, MdAttachFile, MdClear, MdClose, MdEmojiEmotions, MdFormatClear, MdOutlineEmojiEmotions, MdSend } from "react-icons/md";
import { FaChevronDown, FaChevronUp, FaClosedCaptioning, FaDownload, FaEllipsisV, FaInfoCircle, FaReply, FaTrash } from "react-icons/fa";
import { FaFilePdf, FaFile, FaFileArchive, FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoPersonRemoveOutline } from "react-icons/io5";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { HiMiniArrowLeftStartOnRectangle } from "react-icons/hi2";
import { BsSearch } from "react-icons/bs";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import AddMemberModal from "./AddMemberModal";
import { CiEdit } from "react-icons/ci";
import { useChatContext } from "../../context/ChatContext";
import EditGroupModal from "./EditModal";
import EmojiPicker from "emoji-picker-react";

import '../../styles/index.css';


const Chat = React.memo(() => {
    const { currentComponent } = useChatContext();
    //current chat
    const [pendingGroupChat, setPendingGroupChat] = useState(null);
    const [currentChat, setCurrentChat] = useState(null);
    const [headerColor, setHeaderColor] = useState(null);
    const [showInfo, setShowInFo] = useState(false);
    const isMounted = useRef(true);
    //reaction
    const [activeReaction, setActiveReaction] = useState(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showDetailReaction, setShowDetailReaction] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    //edit group
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showEditMember, setShowEditMember] = useState(null);
    const [showLeaveGroup, setShowLeaveGroup] = useState(false);
    //edit group info
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    //send message
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [temporaryMessages, setTemporaryMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showRecall, setShowRecall] = useState(false);
    const messagesEndRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    //search bar
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const searchInputRef = useRef(null);

    const { user, socket } = useUser();
    const dropdownRef = useRef(null);

    //upload file
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    console.log('Curent Chat', currentChat);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        }
    }, []);

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
                return () => <Groups setPendingGroupChat={setPendingGroupChat} />;
            case 'Contacts':
                return () => <Contacts setCurrentChat={setCurrentChat} />;
            case 'Profile':
                return Profile;
            default:
                return () => <ConversationList setCurrentChat={setCurrentChat} pendingGroupChat={pendingGroupChat} />;
        }
    }, [currentComponent, setCurrentChat, pendingGroupChat]);


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

        socket.on('group:created', (data) => {
            console.log('Group created:', data);

            if (data.newConversation && data.newConversation.creator === user._id) {
                setCurrentChat({
                    ...data.newConversation,
                    isTemporary: false
                });
            }
            if (temporaryMessages.length > 0) {
                const updatedTempMessages = temporaryMessages.map(msg => ({
                    ...msg,
                    conversationId: data.newConversation._id
                }));
                setTemporaryMessages(updatedTempMessages);
            }
            setPendingGroupChat(data.newConversation);
        })
        const handleChatUpdate = (update) => {
            console.log('Chat updated:', update);
            if (update.type === 'update_members') {
                if (currentChat && currentChat._id === update.data.conversationId) {
                    setCurrentChat(prev => ({
                        ...prev,
                        members: update.data.members,
                        lastMessage: update.data.lastMessage
                    }));

                    if (update.data.lastMessage) {
                        const newMessage = {
                            ...update.data.lastMessage,
                        }
                        setMessages(prev => [...prev, newMessage]);
                    }
                }
            }
            if (update.type === 'update_group_info') {
                if (currentChat && currentChat._id === update.data.conversationId) {
                    setCurrentChat(prev => ({
                        ...prev,
                        name: update.data.name || prev.name,
                        avatarGroup: update.data.avatarGroup || prev.avatarGroup,
                    }));
                    if (update.data.lastMessage) {
                        const newMessage = {
                            ...update.data.lastMessage,
                        }
                        setMessages(prev => [...prev, newMessage]);
                    }
                }
            }
        }
        const handleRemoveMembers = (data) => {
            console.log('Remove members:', data);

            if (currentChat && currentChat._id === data.conversationId) {
                setCurrentChat(null);
                setMessages([]);
            }
        }
        socket.on('group:removed', handleRemoveMembers);
        socket.on('group:left', handleRemoveMembers);
        socket.on('chat:update', handleChatUpdate);
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
        });

        socket.on('message:recall-success', (data) => {
            console.log('Message recalled:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.message) {
                        if (data.recallType === 'everyone') {
                            return {
                                ...msg,
                                isRecalled: true,
                                recallType: data.recallType,
                                content: data.actor._id === msg.sender._id ? 'You recalled this message' : `${data.actor.name} recalled this message`
                            }
                        } else if (data.recallType === 'self') {
                            return {
                                ...msg,
                                isRecalled: true,
                                recallType: data.recallType,
                                content: data.actor._id === msg.sender._id ? 'You recalled this message' : msg.content
                            }
                        }
                    }
                    return msg;
                }))
            }
        });

        return () => {
            socket.off('group:created');
            socket.off('chat:created');
            socket.off('chat:update', handleChatUpdate);
            socket.off('group:removed', handleRemoveMembers);
            socket.off('group:left', handleRemoveMembers);
            socket.off('message:new');
            socket.off('chat:loadded');
            socket.off('conversation:read');
            socket.off('message:react-success');
            socket.off('message:reply-success');
            socket.off('message:recall-success');
            socket.off('user:entered');
            socket.off('conversation:update');
        }
    }, [socket, currentChat, temporaryMessages, user._id]);

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

    //Edit mode

    const openEditModal = () => {
        setIsEditModalOpen(true);
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    }
    const handleAddMembers = async (selectedMembers) => {
        console.log('Selected members:', selectedMembers);
        if (!currentChat || !selectedMembers) return;

        setLoading(true);

        try {
            socket.emit('group:add-member', {
                conversationId: currentChat._id,
                conversationType: currentChat.type,
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
        console.log('Remove member:', memberId);
        if (!currentChat) return;

        setLoading(true);

        try {
            socket.emit('group:remove-member', {
                conversationId: currentChat._id,
                conversationType: currentChat.type,
                updatedBy: user,
                membersToRemove: [memberId]
            })
        } catch (error) {
            console.error('Error removing members:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleShowLeaveGroup = (e) => {
        e.stopPropagation();
        setShowLeaveGroup(!showLeaveGroup);
    }

    // handle action in group
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowLeaveGroup(false);
                setShowEditMember(null);
            }
        };

        if (showLeaveGroup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        if (showEditMember !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLeaveGroup, showEditMember]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLeaveGroup = () => {
        setShowLeaveGroup(false);
        console.log('Leave group:', currentChat._id);
        const currentUser = currentChat.members.find(m => m._id === user._id);
        if (currentUser?.role === 'admin') {
            alert('You cannot leave the group as an admin. Please remove yourself from the group or transfer admin rights to another member.');
            return;
        }
        if (!currentChat) return;

        setLoading(true);

        try {
            socket.emit('group:leave', {
                conversationId: currentChat._id,
                user: {
                    _id: user._id,
                    name: user.name,
                    avatar: user.avatar
                }
            });
            socket.once('group:leave-success', () => {
                // Handle successful leave (e.g., redirect to chat list)
                console.log('Successfully left the group');
            });
        } catch (error) {
            console.error('Error leaving group:', error);
        } finally {
            setLoading(false);
            setShowLeaveGroup(false); // Close the dropdown menu

        }
    }
    const handleTransferAdmin = (newAdmin) => {
        setShowEditMember(null);
        if (!currentChat) return;

        setLoading(true);

        try {
            socket.emit('transfer:admin', {
                conversationId: currentChat._id,
                currentUserId: user,
                newAdminId: newAdmin,
            });
        } catch (error) {
            console.error('Error transferring admin:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleTransferDeputyAdmin = (newDeputyAdmin) => {
        setShowEditMember(null);
        if (!currentChat) return;

        setLoading(true);

        try {
            socket.emit('transfer:deputy', {
                conversationId: currentChat._id,
                currentUserId: user,
                newDeputyId: newDeputyAdmin,
            });
        } catch (error) {
            console.error('Error transferring deputy admin:', error);
        } finally {
            setLoading(false);
        }
    }
    //render message personalize
    const renderAddMessage = (message) => {
        if (!message.metadata) return null;
        if (message.metadata.action === 'member_added') {
            const { addedBy, addedMembers } = message.metadata || {};
            if (!addedBy || !addedMembers) return null;

            const memberNames = addedMembers.map(m => m.name).join(', ');
            if (addedBy._id === user._id) {
                return `You added ${memberNames}`;
            }
            if (addedMembers.some(m => m._id === user._id)) {
                return `${addedBy.name} added you`;
            }

            return `${addedBy.name} added ${memberNames}`;
        }
        if (message.metadata.action === 'member_removed') {
            const { removedBy, removedMembers } = message.metadata || {};
            const memberNames = removedMembers.map(m => m.name).join(', ');
            if (removedBy._id === user._id) {
                return `You removed ${memberNames}`;
            }
            if (removedMembers.some(m => m._id === user._id)) {
                return `${removedBy.name} removed you`;
            }
            return `${removedBy.name} removed ${memberNames}`;
        }
        if (message.metadata.action === 'admin_transferred') {
            const { transferredBy, newAdmin } = message.metadata || {};

            const memberNames = newAdmin.name
            if (transferredBy._id === user._id) {
                return `You transferred admin rights to ${memberNames}`;
            }
            if (newAdmin._id === user._id) {
                return `${transferredBy.name} transferred admin rights to you`;
            }
            return `${transferredBy.name} transferred admin rights to ${memberNames}`;
        }
        if (message.metadata.action === 'deputy_transferred') {
            const { transferredBy, newDeputy } = message.metadata || {};

            const memberNames = newDeputy.name
            if (transferredBy._id === user._id) {
                return `You transferred deputy admin rights to ${memberNames}`;
            }
            if (newDeputy._id === user._id) {
                return `${transferredBy.name} transferred deputy admin rights to you`;
            }
            return `${transferredBy.name} transferred deputy admin rights to ${memberNames}`;
        }
        if (message.metadata.action === 'member_left') {
            const { leftBy } = message.metadata || {};
            if (!leftBy) return null;
            return `${leftBy.name} left the group`;
        }
        if (message.metadata.action === 'group_info_updated') {
            const { updatedBy, groupInfo } = message.metadata || {};
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
    }

    // Handle file upload
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
    }
    useEffect(() => {
        console.log('Selected files updated:', selectedFiles);
    }, [selectedFiles]);

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }

    const getFileType = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('document') || mimeType === 'application/msword' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'document';
        if (mimeType.includes('spreadsheet') || mimeType === 'application/vnd.ms-excel' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'spreadsheet';
        if (mimeType.includes('presentation') || mimeType === 'application/vnd.ms-powerpoint' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'presentation';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
        return 'document';
    };

    const uploadFiles = async (files) => {
        setIsUploading(true);
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
            setIsUploading(false);
        }
    }
    //handle send message
    const onEmojiClick = (emoji) => {
        setInputMessage(prev => prev + emoji.emoji);
    }
    const customTheme = {
        theme: 'dark',
        emojiStyle: 'facebook', // 'native', 'apple', 'google', 'twitter', 'facebook'
        previewConfig: {
            showPreview: true,
            defaultBackgroundColor: '#262626', // Dark background
        },
        skinTonesDisabled: false,
        searchPlaceHolder: 'Search emojis...',
        categories: {
            custom: {
                name: 'Recently Used',
                category: 'recent',
            },
        },
        defaultSkinTone: 1,
        customEmojis: [],
    };

    // Apply custom styles with CSS (may require additional setup)
    const customStyles = {
        emojiPickerContainer: {
            "--epr-bg-color": "#262626",          // Background color
            "--epr-category-label-bg-color": "#333333", // Category label background
            "--epr-text-color": "#f0f0f0",        // Text color
            "--epr-hover-bg-color": "#404040",    // Hover background
            "--epr-active-skin-tone-color": "#8b5cf6", // Active skin tone (purple)
            "--epr-picker-border-color": "#404040", // Border color
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            borderRadius: "12px",
            overflowY: "auto"  // Ẩn thanh cuộn dọc
        }
    };

    const sendMessage = useCallback(async (e) => {
        if (e) e.preventDefault();
        setShowEmojiPicker(false);
        console.log("sendMessage triggered", { inputMessage, filesCount: selectedFiles.length });

        if (!inputMessage.trim() && selectedFiles.length === 0) {
            console.log("Nothing to send");
            return;
        }

        try {
            console.log("Sending message:", inputMessage, selectedFiles);
            const tempId = `temp_${Date.now()}`;
            let attachments = [];

            if (selectedFiles.length > 0) {
                try {
                    attachments = await uploadFiles(selectedFiles);
                } catch (error) {
                    console.error('Error uploading files:', error);
                    return;
                }
            }
            // If replying to a message
            if (replyingTo) {
                socket.emit('reply:message', {
                    messageId: replyingTo._id,
                    content: inputMessage,
                    tempId: tempId,
                    attachments: attachments
                });
            } else {
                console.log("Attachments:", attachments);
                // Normal message
                const messagePayload = {
                    conversationId: currentChat._id,
                    content: inputMessage,
                    attachments: attachments,
                    replyTo: null,
                    type: attachments.length > 0 ? 'multimedia' : 'text',
                    tempId: tempId
                };
                socket.emit('send:message', messagePayload);
            }
            console.log("Message sent!");
            setReplyingTo(null);
            setInputMessage('');
            setSelectedFiles([]);
            setUploadProgress({});
            // setShowEmojiPicker(false);
        } catch (error) {
            console.error('Error sending message', error);
        }
    }, [inputMessage, currentChat, socket, replyingTo, selectedFiles, uploadFiles]);

    // Handle recall message
    const handleRecall = useCallback((messageId, recallType, conversationId) => {
        setShowRecall(false);
        socket.emit('recall:message', {
            messageId,
            recallType,
            conversationId
        });
    }, [socket]);

    //handle search message
    const toggleSearchMode = () => {
        setSearchMode(prev => !prev);
        if (!searchMode) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            setSearchQuery('');
            setSearchResults([]);
            setCurrentResultIndex(0);
        }
    };

    const scrollToMessage = (messageId) => {
        if (highlightedMessageId) {
            const prevElement = document.getElementById(`message-${highlightedMessageId}`);
            if (prevElement) {
                prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg');
            }
        }
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            setHighlightedMessageId(messageId);
        }
    }

    const searchMessages = (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const lowerCaseQuery = query.toLowerCase();
        const results = allMessages.filter(msg =>
            !msg.isRecalled &&
            msg.content &&
            msg.content.toLowerCase().includes(lowerCaseQuery)
        );

        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : -1);

        if (results.length > 0) {
            scrollToMessage(results[0]._id);
        }
    }

    const navigateSearchResults = (direction) => {
        if (searchResults.length === 0) return;

        let newIndex;
        if (direction === 'up') {
            newIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;
        } else {
            newIndex = currentResultIndex >= searchResults.length - 1 ? 0 : currentResultIndex + 1;
        }

        setCurrentResultIndex(newIndex);
        scrollToMessage(searchResults[newIndex]._id);
    }
    const clearSearch = () => {
        setSearchQuery('');
        if (highlightedMessageId) {
            const prevElement = document.getElementById(`message-${highlightedMessageId}`);
            if (prevElement) {
                prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg');
            }
            setHighlightedMessageId(null);
        }
        setSearchResults([]);
        setCurrentResultIndex(0);
    }
    useEffect(() => {
        if (searchQuery) {
            searchMessages(searchQuery);
        } else {
            setSearchResults([]);
            setCurrentResultIndex(0);

            if (highlightedMessageId) {
                const prevElement = document.getElementById(`message-${highlightedMessageId}`);
                if (prevElement) {
                    prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg');
                }
                setHighlightedMessageId(null);
            }
        }

    }, [searchQuery, highlightedMessageId]);

    //handle message rendering
    const renderMessage = (msg) => {
        if (msg.isRecalled) {
            if (msg.recallType === 'everyone') {
                return <span className="italic text-neutral-400">{
                    msg.sender._id === user._id ? 'You recalled this message' : `${msg.sender.name} recalled this message`
                }</span>
            } else if (msg.recallType === 'self') {
                return (
                    msg.sender._id === user._id ? (
                        <span className="italic text-neutral-400">You recalled this message</span>
                    ) : (
                        <span className="">{msg.content}</span>
                    )
                )
            }
        }
        return msg.content;
    }

    //handle reply message
    const handleReply = useCallback((message) => {
        setReplyingTo(message);
    }, []);

    const cancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

    const allMessages = [...messages, ...temporaryMessages]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    //handle reaction
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
                        {currentChat.type === 'department' ? (
                            currentChat.name.charAt(0).toUpperCase() + currentChat.name.charAt(1).toUpperCase()
                        ) : (
                            <>
                                <img
                                    src={currentChat.avatarGroup}
                                    className="w-10 h-10 rounded-full"
                                />
                            </>
                        )}
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
    const sortedMembers = [...(currentChat?.members || [])].sort((a, b) => {
        const rolePriority = { 'admin': 1, 'deputy_admin': 2, 'member': 3 };
        return rolePriority[a.role] - rolePriority[b.role];
    });
    const renderInfoSidebar = () => {
        if (!currentChat) return null;
        if (currentChat.type === 'private') {
            const contactUser = currentChat.members?.find(member => member._id !== user._id);

            return (
                <div className="w-[350px] dark:bg-neutral-900 dark:text-white shadow-lg p-4 scrollbar-none overflow-y-auto max-h-[calc(100vh)]">
                    {/* Profile Section */}
                    <div className="relative">
                        <img
                            src={contactUser?.avatar}
                            alt="User"
                            className="w-full h-48 object-cover rounded-lg opacity-30"
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
                            {messages.map(msg => msg.attachments).flat().slice(0, 5).map((attachment, index) => {
                                if (attachment.fileType === 'image') {
                                    return (
                                        <div className="" key={index}>
                                            <RenderAttachment key={index} attachment={attachment} />
                                        </div>
                                    )
                                }
                            })}
                        </div>
                    </div>

                    {/* Attached Files */}
                    <div className="py-5 border-t border-gray-700">
                        <h4 className="text-xs text-gray-400">SHARED FILES</h4>
                        <div className="mt-2 space-y-3">
                            {/* Placeholder for shared files */}
                            {messages.map(msg => msg.attachments).flat().map((attachment, index) => (
                                attachment.fileType !== 'image' && (
                                    <RenderAttachment key={index} attachment={attachment} />
                                )
                            ))}
                        </div>
                    </div>
                </div>
            )
        }

        if (currentChat.type === 'group' || currentChat.type === 'department') {
            return (
                <div className="w-[350px] dark:bg-neutral-900 dark:text-white shadow-lg p-4 overflow-y-auto scrollbar-none">
                    {/* Profile Section */}
                    <div className="relative">
                        <img
                            src={currentChat.avatarGroup}
                            alt="User"
                            className="w-full h-48 object-cover rounded-lg opacity-50"
                        />
                        <button
                            className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full"
                            onClick={handleShowLeaveGroup}
                        >
                            <FaEllipsisV className="text-white" />
                        </button>
                        {showLeaveGroup && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-10 right-0 dark:bg-neutral-800 text-black p-2 rounded-lg shadow-lg z-10 w-1/2 text-sm  transition-colors duration-200 space-y-2">
                                <button
                                    className="text-red-500 flex items-center space-x-3 dark:hover:bg-neutral-700 w-full rounded p-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLeaveGroup();
                                    }}
                                >
                                    <HiMiniArrowLeftStartOnRectangle className="mt-0.5" />
                                    <p className="">Leave Group</p>
                                </button>
                                <button
                                    className="text-blue-500 flex items-center space-x-3 dark:hover:bg-neutral-700 w-full rounded p-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal();
                                        setShowLeaveGroup(false);
                                    }}
                                >
                                    <CiEdit className="mt-0.5" />
                                    <p className="">Edit Group</p>
                                </button>
                            </div>
                        )}
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
                    {isEditModalOpen && (
                        <EditGroupModal
                            isOpen={isEditModalOpen}
                            onClose={closeEditModal}
                            currentChat={currentChat}
                            initialName={currentChat?.name}
                            initialAvatar={currentChat?.avatarGroup}
                            isUploading={isUploading}
                            uploadFiles={uploadFiles}
                        />
                    )}

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
                            <button
                                className="text-green-400 text-xs"
                                onClick={() => setShowAddMemberModal(true)}
                            >
                                <MdAdd className="text-lg" />
                            </button>
                        </div>
                        <div className="mt-2 space-y-3">
                            {sortedMembers?.slice(0, 5).map((member) => {
                                const isCurrentUserAdmin = sortedMembers.some(m => m._id === user?._id && m.role === 'admin');
                                const isCurrentUserDeputyAdmin = sortedMembers.some(m => m._id === user?._id && m.role === 'deputy_admin');
                                const isCurrentUser = member._id === user?._id;
                                const isAdmin = member.role === 'admin';
                                const isDeputyAdmin = member.role === 'deputy_admin';
                                const isMember = member.role === 'member';

                                return (
                                    <div key={member._id} className="flex items-center justify-between p-2">
                                        <div className="flex items-center space-x-3">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                                    {member.name?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="dark:text-white text-sm">{member.name}</p>
                                                <p className="text-gray-400 text-[10px]">{member.position} - {member.department?.name}</p>
                                            </div>
                                        </div>

                                        {/* ADMIN VIEW */}
                                        {isCurrentUserAdmin && !isCurrentUser && (
                                            <div className="relative">
                                                {/* Admin can manage members */}
                                                {isMember && (
                                                    <button onClick={() => setShowEditMember(showEditMember === member._id ? null : member._id)}>
                                                        <FaEllipsisV />
                                                    </button>
                                                )}
                                                {/* Admin can manage deputy admins with limited options */}
                                                {isDeputyAdmin && (
                                                    <button onClick={() => setShowEditMember(showEditMember === member._id ? null : member._id)}>
                                                        <FaEllipsisV />
                                                    </button>
                                                )}
                                                {/* Admin sees Admin text for other admins */}
                                                {isAdmin && !isCurrentUser && (
                                                    <div className="dark:text-gray-400 text-[10px]">Admin</div>
                                                )}

                                                {showEditMember === member._id && (
                                                    <div ref={dropdownRef} className="absolute flex flex-col right-3 dark:text-white w-28 h-fit py-2 space-y-2 dark:bg-neutral-800 text-black rounded-lg shadow-lg z-10 text-sm">
                                                        {/* Menu for members */}
                                                        {isMember && (
                                                            <>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleRemoveMemebers(member._id)}
                                                                >
                                                                    <IoPersonRemoveOutline />
                                                                    <p>Remove</p>
                                                                </button>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleTransferAdmin(member)}
                                                                >
                                                                    <CiEdit />
                                                                    <p>Assign Admin</p>
                                                                </button>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleTransferDeputyAdmin(member)}
                                                                >
                                                                    <CiEdit />
                                                                    <p>Assign Deputy</p>
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* Menu for deputy admins */}
                                                        {isDeputyAdmin && (
                                                            <>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleRemoveMemebers(member._id)}
                                                                >
                                                                    <IoPersonRemoveOutline />
                                                                    <p>Remove</p>
                                                                </button>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleRecallDeputyAdmin(member)}
                                                                >
                                                                    <CiEdit />
                                                                    <p>Recall Deputy</p>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* DEPUTY ADMIN VIEW */}
                                        {isCurrentUserDeputyAdmin && !isCurrentUser && (
                                            <div className="relative">
                                                {/* Deputy admin can only manage regular members */}
                                                {isMember && (
                                                    <>
                                                        <button onClick={() => setShowEditMember(showEditMember === member._id ? null : member._id)}>
                                                            <FaEllipsisV />
                                                        </button>

                                                        {showEditMember === member._id && (
                                                            <div ref={dropdownRef} className="absolute flex flex-col right-3 dark:text-white w-28 h-fit py-2 space-y-2 dark:bg-neutral-800 text-black rounded-lg shadow-lg z-10 text-sm">
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleRemoveMemebers(member._id)}
                                                                >
                                                                    <IoPersonRemoveOutline />
                                                                    <p>Remove</p>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {/* Deputy admin just sees role labels for admin and other deputy admins */}
                                                {(isAdmin || isDeputyAdmin) && (
                                                    <div className="dark:text-gray-400 text-[10px]">
                                                        {isAdmin ? 'Admin' : 'Deputy Admin'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MEMBER VIEW or viewing yourself - just show role text */}
                                        {(!isCurrentUserAdmin && !isCurrentUserDeputyAdmin) || isCurrentUser ? (
                                            <div className="dark:text-gray-400 text-[10px]">
                                                {isAdmin ? 'Admin' : isDeputyAdmin ? 'Deputy Admin' : 'Member'}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                            {(sortedMembers.members?.length || 0) > 5 && (
                                <div className="text-center text-green-400 text-sm mt-2">
                                    +{(sortedMembers.members?.length || 0) - 5} more
                                </div>
                            )}
                        </div>
                        {showAddMemberModal && (
                            <AddMemberModal
                                onClose={() => setShowAddMemberModal(false)}
                                onAddMembers={handleAddMembers}
                                currentMembers={currentChat.members || []}
                            />
                        )}
                    </div>

                    {/* Media Section */}
                    <div className="py-5 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs text-gray-400">SHARED MEDIA</h4>
                            <button className="text-green-400 text-xs">Show all</button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {messages.map(msg => msg.attachments).flat().map((attachment, index) => (
                                attachment.fileType === 'image' && (
                                    <RenderAttachment key={index} attachment={attachment} />
                                )
                            ))}
                        </div>
                    </div>

                    {/* Shared Files */}
                    <div className="py-5 border-t border-gray-700">
                        <h4 className="text-xs text-gray-400">SHARED FILES</h4>
                        <div className="mt-2 space-y-3">
                            {messages.map(msg => msg.attachments).flat().map((attachment, index) => (
                                file.fileType !== 'image' && (
                                    <RenderAttachment key={index} attachment={file} />
                                )
                            ))}
                        </div>
                    </div>
                </div>
            )
        }
        return null;
    }

    const FilePreview = () => {
        if (selectedFiles.length === 0) return null;

        return (
            <div>
                {selectedFiles.map((file, index) => (
                    <div
                        key={index}
                        className="relative flex items-center bg-neutral-700 rounded p-2"
                    >
                        <span className="text-white truncate max-w-xs">
                            {file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}
                        </span>
                        <button
                            onClick={() => removeSelectedFile(index)}
                            className="ml-2 text-white hover:bg-neutral-600 rounded-full p-1"
                        >
                            <MdClose />
                        </button>
                        {isUploading && uploadProgress[index] !== undefined && (
                            <div
                                className="absolute bottom-0 left-0 h-1 bg-purple-600 rounded"
                                style={{ width: `${uploadProgress[index]}%`, transition: 'width 0.3s ease' }}
                            />
                        )}
                    </div>
                ))}
            </div>
        )
    }

    const inputMessageUI = () => {
        return (
            <div className="flex flex-col">
                <FilePreview />
                <div className="py-3 px-10 border-t border-gray-700 flex items-center space-x-3">
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        id="file-upload"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer"
                    >
                        <MdAttachFile className="text-2xl hover:bg-neutral-300 rounded-full p-1 text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700" />
                    </label>
                    <div className="relative">
                        <MdEmojiEmotions
                            className="text-2xl hover:bg-neutral-300 rounded-full p-1 text-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-700"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        />
                        {showEmojiPicker && (
                            <div className="absolute bottom-10 left-0 z-10" ref={emojiPickerRef} id="emoji-picker-wrapper">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={customTheme.theme}
                                    emojiStyle={customTheme.emojiStyle}
                                    width="320px"
                                    height="350px"
                                    previewConfig={customTheme.previewConfig}
                                    skinTonesDisabled={customTheme.skinTonesDisabled}
                                    searchPlaceHolder={customTheme.searchPlaceHolder}
                                    categories={customTheme.categories}
                                    defaultSkinTone={customTheme.defaultSkinTone}
                                    customEmojis={customTheme.customEmojis}
                                    lazyLoadEmojis={true}
                                    style={customStyles.emojiPickerContainer}
                                />
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isUploading && sendMessage(e)}
                        placeholder={isUploading ? "Uploading files..." : "Type a message..."}
                        className="flex-1 p-2 rounded-lg dark:bg-neutral-800 dark:text-white bg-neutral-200  outline-none"
                        disabled={isUploading}
                    />
                    <button
                        className={`ml-2 p-2 ${isUploading ? 'bg-neutral-500' : 'bg-purple-800'} text-white rounded-lg`}
                        onClick={(e) => {
                            console.log("Send button clicked");
                            if (!isUploading) sendMessage(e);
                        }}
                        disabled={isUploading}
                    >
                        <MdSend />
                    </button>
                </div>
            </div>
        )
    }

    const formatFileSize = (size) => {
        if (!size) return '0 KB';
        const units = ['B', 'KB', 'MB', 'GB'];
        let index = 0;
        let formattedSize = size;
        while (formattedSize >= 1024 && index < units.length - 1) {
            formattedSize /= 1024;
            index++;
        }
        return `${formattedSize.toFixed(1)} ${units[index]}`;
    }
    const truncateFileName = (name, maxLength = 20) => {
        if (!name) return '';
        return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
    };

    const RenderAttachment = ({ attachment }) => {
        const { original, fileType, fileUrl, fileName, fileSize, _id } = attachment;
        const serverMediaUrl = `http://localhost:5000/api/file/media/${_id}`;
        if (fileType === 'image') {
            return (
                <div className="w-full max-w-xs relative group">
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="w-full h-auto rounded"
                    />
                    {/* Thẻ a ẩn, chỉ để trình duyệt nhận ra liên kết khi click phải */}
                    <a
                        href={serverMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-auto"
                        aria-label={`View ${fileName} in new tab`}
                        onClick={(e) => e.preventDefault()}
                    >
                        {/* Không cần nội dung */}
                    </a>
                </div>
            );
        }

        if (fileType === 'video') {
            return (
                <div className="w-full max-w-xs">
                    <video
                        src={fileUrl}
                        controls
                        className="w-full h-auto rounded"
                    />
                </div>
            )
        }
        return (
            <div className="flex item-center p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                <div className="mr-2">
                    {fileType === 'pdf' && <FaFilePdf className="text-red-500 text-2xl" />}
                    {fileType === 'document' && <FaFileWord className="text-blue-500 text-2xl" />}
                    {fileType === 'presentation' && <FaFilePowerpoint className="text-orange-500 text-2xl" />}
                    {fileType === 'spreadsheet' && <FaFileExcel className="text-green-500 text-2xl" />}
                    {fileType === 'archive' && <FaFileArchive className="text-yellow-500 text-2xl" />}
                    {!['pdf', 'document', 'presentation', 'spreadsheet', 'archive'].includes(fileType) && <FaFile className="text-gray-500 text-2xl" />}
                </div>
                <div>
                    <a
                        href={serverMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dark:text-neutral-300 hover:underline truncate max-w-[180px]"
                        download={original}
                    >
                        {truncateFileName(fileName)}
                    </a>
                    <span className="text-xs text-neutral-400">{formatFileSize(fileSize)}</span>
                </div>
            </div>
        )
    }

    //handle readAt and readBy
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

    const checkAdmin = currentChat?.members?.some(member => member._id === user._id && (member.role === 'admin' || member.role === 'deputy_admin'));

    return (
        <div className="flex h-full w-full dark:text-white">
            <div className="dark:bg-neutral-900 w-[370px] bg-neutral-50">
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
                                    <button
                                        className={`relative ${searchMode ? 'text-purple-500' : ''}`}
                                        onClick={toggleSearchMode}
                                    >
                                        <BsSearch />
                                    </button>
                                    {searchMode && (
                                        <div className="absolute top-16 right-0 z-10 dark:bg-neutral-800 rounded-lg shadow-lg p-1 flex flex-col w-full">
                                            <div className="flex items-center mb-2">
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search messages..."
                                                    className="flex-1 px-2 rounded-lg border dark:border-neutral-600 dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                                <button
                                                    onClick={clearSearch}
                                                    className="ml-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                                >
                                                    <MdFormatClear />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-neutral-500">
                                                    {searchResults.length > 0
                                                        ? `${currentResultIndex + 1} of ${searchResults.length} results`
                                                        : searchQuery ? "No results found" : ''
                                                    }
                                                </span>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => navigateSearchResults('up')}
                                                        disabled={searchResults.length === 0}
                                                        className={` rounded ${searchResults.length === 0 ? 'text-neutral-400 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                                                    >
                                                        <FaChevronUp />
                                                    </button>
                                                    <button
                                                        onClick={() => navigateSearchResults('down')}
                                                        disabled={searchResults.length === 0}
                                                        className={` rounded ${searchResults.length === 0 ? 'text-neutral-400 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                                                    >
                                                        <FaChevronDown />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                                if (msg.metadata?.action === 'member_added') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'member_removed') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'admin_transferred') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'deputy_transferred') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'group_info_updated') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <div className="flex justify-center items-center mb-4" key={msg._id}>
                                                        {msg.content}
                                                    </div>
                                                )
                                            }
                                            const isCurrentUser = msg.sender._id === user._id;
                                            return (
                                                <div id={`message-${msg._id}`} key={msg._id} className={`flex justify-${msg.sender._id === user._id ? 'end' : 'start'} mb-4`}>
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

                                                            {msg.type === 'multimedia' && msg.attachments.length > 0 ? (
                                                                <div className="mb-2 flex flex-wrap gap-2">
                                                                    {msg.attachments.map((attachment, index) => (
                                                                        <RenderAttachment key={index} attachment={attachment} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className={`relative max-w-xs w-fit rounded-lg px-3 py-2 ${isCurrentUser ? 'bg-purple-700 text-white' : 'bg-gray-200 dark:bg-neutral-600 dark:text-white w-fit'}`}>
                                                                    <div>
                                                                        {msg.content &&
                                                                            <div className="w-fit group">
                                                                                {renderMessage(msg)}
                                                                                {msg.reactions.length > 0 && (
                                                                                    <div
                                                                                        className={`absolute cursor-pointer -bottom-[10px] ${msg.sender._id === user._id ? '-left-2' : '-right-2'} flex items-center justify-center space-x-1 dark:text-neutral-400 dark:bg-neutral-700 bg-neutral-200 rounded-full shadow-xl px-1`}
                                                                                        onClick={() => handleShowDetailReaction(msg._id)}
                                                                                    >
                                                                                        {Object.entries(reactionsMap).map(([emoji, data]) => (
                                                                                            <span
                                                                                                key={emoji}
                                                                                                className="text-[12px] cursor-pointer flex items-center dark:hover:bg-neutral-600 hover:bg-neutral-300  rounded-full"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleReaction(msg._id, emoji);
                                                                                                }}
                                                                                                title={`${data.users.length} person reacted ${emoji}`}
                                                                                            >
                                                                                                {emoji}
                                                                                            </span>
                                                                                        ))}
                                                                                        <span className="text-xs dark:text-neutral-300">
                                                                                            {msg.reactions.length}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {/* reaction details */}
                                                                                {showDetailReaction === msg._id && (
                                                                                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                                                                                        <div className={`p-8 rounded-lg w-[500px] dark:bg-neutral-800 bg-neutral-200 space-y-5`}>
                                                                                            <div className="flex  justify-between items-center">
                                                                                                <h2 className="text-2xl font-bold">Detail reactions</h2>
                                                                                                <MdClose onClick={handleShowDetailReaction} className="dark:bg-neutral-700 bg-neutral-200 hover:bg-neutral-300 rounded-full p-1 text-2xl dark:hover:bg-neutral-600" />
                                                                                            </div>
                                                                                            <div className="dark:bg-neutral-700 rounded-lg flex items-center justify-between">
                                                                                                <button
                                                                                                    onClick={() => setActiveTab('all')}
                                                                                                    className={`text-xl rounded-full py-1 w-full ${activeTab === 'all' ? 'dark:bg-neutral-600 bg-neutral-300' : 'dark:bg-neutral-00 dark:hover:bg-neutral-600 hover:bg-neutral-300'}`}
                                                                                                >
                                                                                                    <p className="text-base">
                                                                                                        All reaction {msg.reactions.length}
                                                                                                    </p>
                                                                                                </button>
                                                                                                {Object.entries(reactionsMap).map(([emoji, data]) => (
                                                                                                    <button
                                                                                                        key={emoji}
                                                                                                        onClick={() => setActiveTab(emoji)}
                                                                                                        className={`text-lg py-0.5 dark:bg-neutral-700 text-center cursor-pointer flex items-center hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full justify-center w-full ${activeTab === emoji ? 'bg-neutral-300' : ''}`}
                                                                                                    >
                                                                                                        {emoji}
                                                                                                        <span className="ml-1 text-xs">{data.count}</span>
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                            <div className="max-h-[300px] overflow-y-auto">
                                                                                                {activeTab === 'all' ? (
                                                                                                    getUserReactions(msg.reactions).map((item, index) => (
                                                                                                        <div key={index} className="flex items-center justify-between dark:bg-neutral-700 hover:bg-neutral-300 bg-neutral-200 rounded-lg p-2 mb-5">
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
                                                                                                                <div key={index} className="flex items-center justify-between dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-lg p-2 mb-5">
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
                                                                                                    <button
                                                                                                        className="font-semibold bg-neutral-700 px-3 text-sm py-1 rounded-full hover:dark:bg-neutral-600 transition-colors duration-300 w-full"
                                                                                                        onClick={() => handleRecall(msg._id, 'everyone', msg.conversationId)}
                                                                                                    >
                                                                                                        For everyone
                                                                                                    </button>
                                                                                                    <button
                                                                                                        className="font-semibold bg-neutral-700 px-3 text-sm py-1 rounded-full hover:dark:bg-neutral-600 transition-colors duration-300 w-full"
                                                                                                        onClick={() => handleRecall(msg._id, 'self', msg.conversationId)}
                                                                                                    >
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

                                                            )}
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


                            {currentChat.type === 'private' || currentChat.type === 'group' ? (
                                inputMessageUI()
                            ) : currentChat.type === 'department' ? (
                                checkAdmin
                                    ? (
                                        inputMessageUI()
                                    ) : (
                                        <div className="dark:bg-neutral-800 bg-neutral-200 flex flex-col items-center justify-center p-3 rounded-lg">
                                            <p className="text-sm dark:text-neutral-400 text-center">
                                                You don't have permission to send messages in this group
                                            </p>
                                        </div>
                                    )

                            ) : null}
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

