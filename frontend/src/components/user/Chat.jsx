import ConversationList from "./ConversationList";
import Groups from "./Groups";
import Contacts from "./Contacts";
import Profile from "./Profile";
import { MdAdd, MdAttachFile, MdClose, MdEmojiEmotions, MdFormatClear, MdOutlineEmojiEmotions, MdSend, MdDescription, MdFileUpload, MdPictureAsPdf } from "react-icons/md";
import { FaChevronDown, FaChevronUp, FaEllipsisV, FaInfoCircle, FaReply } from "react-icons/fa";
import { FaFilePdf, FaFile, FaFileArchive, FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoPersonRemoveOutline } from "react-icons/io5";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { HiMiniArrowLeftStartOnRectangle } from "react-icons/hi2";
import { BsChevronDown, BsChevronUp, BsPinAngle, BsSearch } from "react-icons/bs";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import AddMemberModal from "./AddMemberModal";
import { CiEdit } from "react-icons/ci";
import { useChatContext } from "../../context/ChatContext";
import EditGroupModal from "./EditModal";
import EmojiPicker from "emoji-picker-react";
import { useAlert } from '../../context/AlertContext'
import '../../styles/index.css';
import { TbPinnedFilled } from "react-icons/tb";
import { RiUnpinLine } from "react-icons/ri";
import ImageViewerModal from "./ImageViewerModal ";
import useWebRTC from "../../../hooks/useWebRTC";
import { FiPhone, FiVideo } from "react-icons/fi";
import IncomingCallModal from "./IncomingCallModel";
import IncallUI from "./IncallUI";
import clientEncryptionService from "../../helper/encryptionService";


const Chat = React.memo(() => {
    const { showAlert } = useAlert(); const { currentComponent, setCurrentComponent } = useChatContext();
    //current chat
    const [pendingGroupChat, setPendingGroupChat] = useState(null); const [currentChat, setCurrentChat] = useState(null);
    const [headerColor, setHeaderColor] = useState(null);
    const [showInfo, setShowInFo] = useState(false);
    const [conversationToHighlight, setConversationToHighlight] = useState(null);
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
    const [typingUsers, setTypingUsers] = useState({});
    const typingTimout = useRef(null);
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
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);
    //search bar
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const searchInputRef = useRef(null);

    const { user, socket, getUserStatus } = useUser();
    const [contactUserStatus, setContactUserStatus] = useState('offline');
    const [contactUser, setContactUser] = useState(null);
    const dropdownRef = useRef(null);

    //upload file
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    //show image viewer
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageAttachments, setImageAttachments] = useState([]);


    useEffect(() => {
        if (!socket || !currentChat || currentChat.type !== 'private') {
            setContactUser(null);
            setContactUserStatus('offline');
            return;
        }

        // Find the other user in the conversation
        const otherUser = currentChat.members?.find(member => member._id !== user._id);
        if (otherUser) {
            // console.log('Setting contact user:', otherUser);
            // console.log('Contact user department:', otherUser.department);
            setContactUser(otherUser);
            // Get current status from getUserStatus function
            setContactUserStatus(getUserStatus(otherUser._id));
        }

        // Listen for status change events
        const handleStatusChange = (data) => {
            if (otherUser && data.userId === otherUser._id) {
                console.log(`Status update for contact ${otherUser.name}: ${data.status}`);
                setContactUserStatus(data.status);
            }
        };

        socket.on('user:status', handleStatusChange);

        // Set up interval to update status periodically
        const statusInterval = setInterval(() => {
            if (otherUser) {
                const currentStatus = getUserStatus(otherUser._id);
                setContactUserStatus(currentStatus);
            }
        }, 5000);

        return () => {
            socket.off('user:status', handleStatusChange);
            clearInterval(statusInterval);
        };
    }, [socket, currentChat, user, getUserStatus]);

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
    }, []);

    const toggleReaction = useCallback((messageId, e) => {
        e.stopPropagation();
        setActiveReaction(activeReaction === messageId ? null : messageId);
    }, []);

    const ComponentToRender = useMemo(() => {
        switch (currentComponent) {
            case 'Groups':
                return () => <Groups setCurrentChat={setCurrentChat} setPendingGroupChat={setPendingGroupChat} />;
            case 'Contacts':
                return () => <Contacts setCurrentChat={setCurrentChat} />;
            case 'Profile':
                return Profile;
            default:
                return () => <ConversationList setCurrentChat={setCurrentChat} pendingGroupChat={pendingGroupChat} highlightConversationId={conversationToHighlight} />;
        }
    }, [currentComponent, setCurrentChat, pendingGroupChat, conversationToHighlight]);


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
                if (currentChat && !currentChat.isTemporary) {
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
                // Don't emit conversation:leave for temporary conversations
                // as they don't exist in the database
                console.log('Skipping conversation:leave for temporary conversation:', currentChat._id);
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            if (currentChat && currentChat.isTemporary) {
                // Don't emit conversation:leave for temporary conversations
                // as they don't exist in the database
                console.log('Cleanup: Skipping conversation:leave for temporary conversation:', currentChat._id);
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [currentChat, socket])

    //handler socket for call      //call function
    const [callState, setCallState] = useState('idle'); // 'idle', 'calling', 'in-call', 'ended'
    const [currenntCallInfo, setCurrentCallInfo] = useState(null);
    const {
        localStream,
        remoteStream,
        startCall,
        answerCall,
        endCall: endWebRTCCall,
        setCurrentCallRef,
        toggleAudio,
        toggleVideo,

    } = useWebRTC(socket, user._id); useEffect(() => {
        if (!socket) return;

        console.log('🔧 Setting up call event listeners...');

        const handleIncomingCall = async (data) => {
            console.log('📞 Incoming call event received:', data);

            if (callState === 'idle') {
                setCallState('receiving');
                setCurrentCallInfo(data);

                if (setCurrentCallRef) {
                    setCurrentCallRef(data.callId);
                    console.log('🔗 Successfully called setCurrentCallRef');
                } else {
                    console.error('🔗 setCurrentCallRef function not available!');
                }
            } else {
                console.log('📞 Call already in progress or ended. Ignoring incoming call.');
                showAlert('Call already in progress or ended. Ignoring incoming call.', 'error');
                socket.emit('call:decline', {
                    callId: data.callId,
                });
            }
        };

        const handleCallMissed = (data) => {
            console.log('Missed call:', data);
            // Use callback to get current state
            setCallState(currentState => {
                setCurrentCallInfo(currentInfo => {
                    if (currentInfo && data.callId === currentInfo.callId) {
                        endWebRTCCall();
                        showAlert('Call was missed', 'info');
                        return null;
                    } else {
                        console.log(`Missed call ${data.callId} is not the current call`);
                        return currentInfo;
                    }
                });
                return currentState === 'receiving' ? 'idle' : currentState;
            });
        }; const handleCallError = (data) => {
            console.error('Call error:', data);
            let errorMessage = 'Unknown error';

            if (data.error === 'User is not online') {
                errorMessage = 'User is currently offline';
            } else if (data.error === 'Recipient not connected') {
                errorMessage = 'User is not available';
            } else if (data.error) {
                errorMessage = data.error;
            }

            showAlert(`Call failed: ${errorMessage}`, 'error');
            setCallState('idle');
            setCurrentCallInfo(null);
            endWebRTCCall();
        }; const handleCallEnded = (data) => {
            console.log('Call ended:', data);
            // Use callback to get current state
            setCurrentCallInfo(currentInfo => {
                if (currentInfo && data.callId === currentInfo.callId) {
                    setCallState(currentState => {
                        endWebRTCCall();

                        // Show appropriate message based on call status and who ended it
                        if (data.status === 'declined') {
                            if (data.declinedBy === user._id) {
                                showAlert('Call declined', 'info');
                            } else {
                                showAlert('Call was declined', 'info');
                            }
                        } else if (data.endedBy && data.endedBy !== user._id) {
                            showAlert('Call ended by other party', 'info');
                        } else {
                            showAlert('Call finished', 'info');
                        }

                        return 'idle';
                    });
                    return null;
                } else {
                    console.log(`Ended call ${data.callId} is not the current call`);
                    return currentInfo;
                }
            });
        }; const handleCallAnswered = (data) => {
            console.log('Call answered:', data);
            // Use callback to get current state
            setCallState(currentState => {
                if (currentState === 'calling') {
                    setCurrentCallInfo(currentInfo => {
                        if (currentInfo && data.callId === currentInfo.callId) {
                            console.log('✅ Call answered successfully, entering inCall state');

                            // Update call info with recipient details if provided
                            if (data.recipient) {
                                console.log('📋 Updating call info with recipient details:', data.recipient);
                                return {
                                    ...currentInfo,
                                    otherParticipant: data.recipient
                                };
                            }

                            return currentInfo;
                        }
                        return currentInfo;
                    });
                    return 'inCall';
                }
                return currentState;
            });
        }

        const handleCallAnswerConfirmed = (data) => {
            console.log('✅ Call answer confirmed:', data);
            // Use callback to get current state
            setCallState(currentState => {
                if (currentState === 'receiving') {
                    return 'inCall';
                }
                return currentState;
            });
        }; const handleCallDeclined = (data) => {
            console.log('Call declined:', data);
            // This event is mainly for logging and specific decline reason handling
            // The actual cleanup will be handled by call:ended event

            if (data.reason === 'no_offer_received') {
                console.log('Call failed due to WebRTC setup error');
            } else {
                console.log('Call was declined by the other party');
            }
        }; const handleCallInitiated = async (data) => {
            console.log('🎯 ===== CALL INITIATED EVENT RECEIVED =====');
            console.log('🎯 Call initiated data:', data);
            console.log('🎯 Current call state:', callState);
            console.log('🎯 Current call info exists:', !!currenntCallInfo);

            // Use callback to get current state
            setCallState(currentState => {
                console.log('🎯 Processing call:initiated, current state:', currentState);
                if (currentState === 'calling') {
                    setCurrentCallInfo(currentInfo => {

                        if (currentInfo) {
                            console.log('🎯 Updating call info with real callId:', data.callId);
                            // Update call info with the real callId
                            const updatedCallInfo = {
                                ...currentInfo,
                                callId: data.callId
                            };

                            console.log('🎯 About to call startCall...');
                            startCall(data.callId, currentInfo.type, currentInfo.recipientId)
                                .then(callStartedSuccessfully => {
                                    console.log('🎯 StartCall result:', callStartedSuccessfully);

                                    if (!callStartedSuccessfully) {
                                        console.error('🎯 Failed to start WebRTC call');
                                        setCallState('idle');
                                        setCurrentCallInfo(null);
                                        socket.emit('call:end', {
                                            callId: data.callId,
                                            status: 'failed'
                                        });
                                    } else {
                                        console.log('🎯 WebRTC call started successfully');
                                    }
                                })
                                .catch(error => {
                                    console.error('🎯 Error starting WebRTC call:', error);
                                    setCallState('idle');
                                    setCurrentCallInfo(null);
                                    socket.emit('call:end', {
                                        callId: data.callId,
                                        status: 'failed'
                                    });
                                });

                            return updatedCallInfo;
                        } else {
                            console.log('🎯 Ignoring call:initiated - no call info');
                            return currentInfo;
                        }
                    });
                } else {
                    console.log('🎯 Ignoring call:initiated - wrong state');
                    console.log('🎯 Expected state: calling, actual:', currentState);
                }

                return currentState;
            });
        };

        console.log('🔧 Registering call event listeners...');
        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:missed', handleCallMissed);
        socket.on('call:error', handleCallError);
        socket.on('call:ended', handleCallEnded);
        socket.on('call:answered', handleCallAnswered);
        socket.on('call:answer-confirmed', handleCallAnswerConfirmed);
        socket.on('call:declined', handleCallDeclined);
        socket.on('call:initiated', handleCallInitiated);
        console.log('✅ All call event listeners registered successfully');

        return () => {
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:ended', handleCallEnded);
            socket.off('call:answered', handleCallAnswered);
            socket.off('call:answer-confirmed', handleCallAnswerConfirmed);
            socket.off('call:declined', handleCallDeclined);
            socket.off('call:missed', handleCallMissed);
            socket.off('call:error', handleCallError);
            socket.off('call:initiated', handleCallInitiated);
        };
    }, [socket, user, showAlert, endWebRTCCall, setCurrentCallRef, startCall]); const handleInitiateCall = async (callType) => {
        console.log('🚀 ===== INITIATING CALL =====');
        console.log('🚀 Call type:', callType);
        console.log('🚀 Current chat:', currentChat);
        console.log('🚀 Call state:', callState);

        if (!currentChat || callState !== 'idle') {
            console.log('🚀 Aborting call - invalid state or no chat');
            return;
        }

        const contactUser = currentChat.type === 'private' ? currentChat.members.find(member => member._id !== user._id) : null;

        if (currentChat.type === 'private' && (!contactUser || !contactUser._id)) {
            console.error('Cannot initiate private call: Contact user not found');
            showAlert('error', 'Cannot initiate private call: Contact user not found');
            return;
        }

        console.log('Current chat type', currentChat.type);
        console.log('Contact user', contactUser);
        if (currentChat.type !== 'private' || !contactUser) {
            console.error('Cannot initiate call: Current chat is not private or contact user not found');
            showAlert('Cannot initiate call: Current chat is not private or contact user not found', 'error');
            return;
        }

        const tempCallInfo = {
            conversationId: currentChat._id,
            type: callType,
            initiator: {
                _id: user._id,
                name: user.name,
                avatar: user.avatar
            },
            recipientId: contactUser._id,
            otherParticipant: {
                _id: contactUser._id,
                name: contactUser.name,
                avatar: contactUser.avatar
            }
        };

        console.log('🚀 Setting call info and state...');
        setCurrentCallInfo(tempCallInfo);
        setCallState('calling');

        try {
            console.log('🚀 Emitting call:initiate event...');
            socket.emit('call:initiate', {
                conversationId: currentChat._id,
                type: callType,
                recipientId: contactUser._id
            });
            console.log('🚀 call:initiate event emitted successfully');
        } catch (error) {
            console.error('🚀 Error initiating call:', error);
            showAlert(`Error initiating call: ${error.message}`, 'error');
            setCallState('idle');
            setCurrentCallInfo(null);
        }

    };
    const handleAnswerCall = async () => {
        if (callState !== 'receiving' || !currenntCallInfo) return;

        try {
            console.log('Emit call:answer event');
            socket.emit('call:answer', {
                callId: currenntCallInfo.callId,  // Use callId, not conversationId
            })
            const answerAccepted = await answerCall(
                currenntCallInfo.callId,  // Use callId, not conversationId
                currenntCallInfo.type,
                currenntCallInfo.initiator._id
            );
            console.log('WebRTC call answer result:', answerAccepted); if (answerAccepted) {
                console.log('WebRTC call answered successfully');
                setCallState('inCall'); // Chuyển ngay sang inCall state
                const initiatorDetails = {
                    _id: currenntCallInfo.initiator._id,
                    name: currenntCallInfo.initiator.name,
                    avatar: currenntCallInfo.initiator.avatar
                };

                setCurrentCallInfo(prev => ({
                    ...prev,
                    otherParticipant: initiatorDetails
                }));
            } else {
                console.error('Failed to start WebRTC call');
                socket.emit('call:decline', {
                    callId: currenntCallInfo.callId,
                    reason: 'webrtc_setup_failed'
                })
                setCallState('idle');
                setCurrentCallInfo(null);
                showAlert('Failed to start WebRTC call', 'error');
            }

        } catch (error) {
            console.error('Error answering call:', error);
            socket.emit('call:decline', {
                callId: currenntCallInfo.callId,
                reason: 'error'
            });
            setCallState('idle');
            setCurrentCallInfo(null);
            showAlert(`Error answering call: ${error.message}`, 'error');
        }
    }; const handleDeclineCall = () => {
        if (callState !== 'receiving' || !currenntCallInfo) return;

        socket.emit('call:decline', {
            callId: currenntCallInfo.callId
        });

        // Don't reset state here, let the call:ended event handle it
        // This ensures both parties get the same cleanup via call:ended event
    };

    const handleEndCall = () => {
        if ((callState !== 'calling' && callState !== 'inCall') || !currenntCallInfo) return;

        console.log(`Ending call: ${currenntCallInfo.callId}`);

        // First end the WebRTC call
        endWebRTCCall();

        // Then emit the socket event
        socket.emit('call:end', {
            callId: currenntCallInfo.callId
        });// Reset the call state
        setCallState('idle');
        setCurrentCallInfo(null);
    }

    //socket event handler
    useEffect(() => {
        if (!socket) return;

        socket.on('chat:loaded', (data) => {
            // console.log('Received chat:loaded data in Chat component:', data);

            if (!data || !data.conversation) {
                console.error('No conversation data received', data);
                return;
            }

            // Clear previous conversation state
            setMessages([]);
            setTemporaryMessages([]);
            setContactUser(null); const chatToSet = {
                ...data.conversation,
                isTemporary: data.isTemporary || data.conversation.isTemporary || false,
                members: data.conversation.members || []
            };

            setCurrentChat(chatToSet);

            // Only mark conversation as read and enter if it's not temporary
            // Temporary conversations don't exist in the database yet
            if (data.conversation._id && !data.isTemporary) {
                socket.emit('conversation:mark-read', {
                    conversationId: data.conversation._id
                });

                console.log(`Entering conversation: ${data.conversation._id}`);
                socket.emit('conversation:enter', {
                    conversationId: data.conversation._id,
                });
            } else if (data.isTemporary) {
                console.log('Skipping database operations for temporary conversation:', data.conversation._id);
            }
        }); socket.on('chat:created', (data) => {
            console.log('Chat created:', data);
            const wasTemporary = currentChat && currentChat.isTemporary;

            setCurrentChat(prev => ({
                ...data.newConversation,
                isTemporary: false
            }));            // If the previous chat was temporary, switch to ConversationList and highlight the new conversation
            if (wasTemporary) {
                setConversationToHighlight(data.newConversation._id);
                setCurrentComponent('ConversationList');
            }

            if (temporaryMessages.length > 0) {
                const updatedTempMessages = temporaryMessages.map(msg => ({
                    ...msg,
                    conversationId: data.newConversation._id
                }));

                // Move temporary messages to permanent messages
                setMessages(prev => [...prev, ...updatedTempMessages]);
                setTemporaryMessages([]);
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
        });
        const handleChatUpdate = (update) => {
            console.log('Chat updated:', update);
            if (update.type === 'update_members') {
                if (currentChat && currentChat._id === update.data.conversationId) {
                    // Always update the members list with the new complete list from server
                    setCurrentChat(prev => ({
                        ...prev,
                        members: update.data.members || prev.members,
                        lastMessage: update.data.lastMessage || prev.lastMessage,
                    }));

                    // Handle new message if present
                    if (update.data.lastMessage) {
                        if (update.data.lastMessage.metadata.action === 'member_removed') {
                            if (update.data.lastMessage.metadata.removedMembers.map(m => m._id).includes(user._id)) {
                                if (currentChat._id === update.data.conversationId) {
                                    setCurrentChat(null);
                                    setMessages([]);
                                }
                            }
                        }
                        const newMessage = {
                            ...update.data.lastMessage,
                        }
                        setMessages(prev => {
                            const messageExists = prev.some(msg => msg._id === newMessage._id);
                            if (messageExists) {
                                return prev.map(msg => {
                                    if (msg._id === newMessage._id) {
                                        return {
                                            ...msg,
                                            ...newMessage
                                        }
                                    }
                                    return msg;
                                })
                            }
                            return [...prev, newMessage];
                        });
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
            if (update.type === 'last_message_update') {
                if (currentChat && currentChat._id === update.data.conversationId) {
                    // Update currentChat's lastMessage immediately
                    setCurrentChat(prev => ({
                        ...prev,
                        lastMessage: update.data.lastMessage || prev.lastMessage,
                    }));

                    // Add the message to the chat if user is actively viewing this conversation
                    if (update.data.lastMessage) {
                        const newMessage = {
                            ...update.data.lastMessage,
                        }
                        setMessages(prev => {
                            const messageExists = prev.some(msg => msg._id === newMessage._id);
                            if (messageExists) {
                                return prev;
                            }
                            return [...prev, newMessage];
                        });
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

        //typing 
        const handleUserTyping = (data) => {
            console.log('Received typing event:', data);
            const { conversationId, userData } = data;

            // Chỉ thêm user khác (không phải current user)
            if (userData._id !== user._id) {
                setTypingUsers(prev => {
                    const newState = { ...prev };

                    if (!newState[conversationId]) {
                        newState[conversationId] = [];
                    }
                    const userExists = newState[conversationId].some(existingUser => existingUser._id === userData._id);

                    if (!userExists) {
                        newState[conversationId] = [...newState[conversationId], user];
                    }
                    return newState;
                });
            }
        }

        const handleUserStopTyping = (data) => {

            const { conversationId, userId } = data;

            setTypingUsers(prev => {
                const newState = { ...prev };
                if (newState[conversationId]) {
                    newState[conversationId] = newState[conversationId].filter(user => user._id !== userId);
                }
                return newState;
            })
        }

        const handleTypingUsers = (data) => {
            const { conversationId, users } = data;

            // Lọc bỏ current user khỏi danh sách
            const filteredUsers = users.filter(u => u._id !== user._id);

            setTypingUsers(prev => ({
                ...prev,
                [conversationId]: filteredUsers
            }));
        }

        socket.on('user:typing', handleUserTyping);
        socket.on('user:stopped-typing', handleUserStopTyping);
        socket.on('typing:users', handleTypingUsers);
        socket.on('message:new', async (data) => {
            // console.log('New message:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                // Decrypt the message content before adding to state
                const decryptedMessage = {
                    ...data.message,
                    content: await clientEncryptionService.decryptMessage(data?.message?.content, data.conversationId)
                };

                // Decrypt attachment filenames if present
                if (data?.message?.attachments && data?.message?.attachments.length > 0) {
                    decryptedMessage.attachments = await Promise.all(
                        data.message.attachments.map(async (attachment) => ({
                            ...attachment,
                            fileName: await clientEncryptionService.decryptMessage(attachment.fileName, data.conversationId)
                        }))
                    );
                }

                setMessages(prev => {
                    const isMessageExists = prev.some(msg => msg._id === decryptedMessage._id);
                    return isMessageExists
                        ? prev
                        : [...prev, decryptedMessage];
                });
            }
        });
        socket.on('message:sent', async (data) => {
            console.log('Message sent:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                // Decrypt the message content before adding to state
                const decryptedMessage = {
                    ...data.message,
                    content: await clientEncryptionService.decryptMessage(data.message.content, data.conversationId)
                };

                // Decrypt attachment filenames if present
                if (data.message.attachments && data.message.attachments.length > 0) {
                    decryptedMessage.attachments = await Promise.all(
                        data.message.attachments.map(async (attachment) => ({
                            ...attachment,
                            fileName: await clientEncryptionService.decryptMessage(attachment.fileName, data.conversationId)
                        }))
                    );
                } setMessages(prev => {
                    const isMessageExists = prev.some(msg => msg._id === decryptedMessage._id);

                    // Check if this is the first message sent by current user in a conversation that was temporary
                    if (!isMessageExists &&
                        currentChat.isTemporary &&
                        data.message.sender === user._id) {

                        // Switch to ConversationList and highlight this conversation
                        setConversationToHighlight(data.conversationId);
                        setCurrentComponent('ConversationList');

                        // // Clear the highlight after a short delay to ensure proper visual feedback
                        // setTimeout(() => {
                        //     setConversationToHighlight(null);
                        // }, 3000);
                    }

                    return isMessageExists
                        ? prev
                        : [...prev, decryptedMessage];
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
                        if (msg.status !== 'read' && msg.sender?._id !== user._id) {
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
            console.log('Message recalled in chat component:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.message) {
                        if (data.recallType === 'everyone') {
                            return {
                                ...msg,
                                isRecalled: true,
                                recallType: data.recallType,
                                content: data.actor._id === user._id ? 'You recalled this message' : `${data.actor.name} recalled this message`
                            }
                        } else if (data.recallType === 'self') {
                            if (data.actor._id === user._id) {
                                return {
                                    ...msg,
                                    isRecalled: true,
                                    recallType: data.recallType,
                                    content: 'You recalled this message'
                                }
                            } else {
                                return {
                                    ...msg,
                                    isRecalled: data.actor._id === msg.sender._id,
                                    recallType: data.recallType
                                }
                            }
                        }
                    }
                    return msg;
                }))
            }
        });

        socket.on('message:pin-success', (data) => {
            console.log('Message pinned:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.message) {
                        return {
                            ...msg,
                            isPinned: true,
                            userPinned: data.userPinned
                        }
                    }
                    return msg;
                }));
                if (data.lastMessage) {
                    const newMessage = {
                        ...data.lastMessage,
                    }
                    setMessages(prev => {
                        const messageExists = prev.some(msg => msg._id === newMessage._id);
                        if (messageExists) {
                            return prev;
                        }
                        return [...prev, newMessage];
                    });
                }

                const pinnedMsg = messages.find(msg => msg._id === data.message);
                if (pinnedMsg) {
                    setPinnedMessages(prev => {
                        // Check if already in the list
                        const alreadyPinned = prev.some(p => p._id === pinnedMsg._id);
                        if (alreadyPinned) {
                            return prev;
                        }
                        return [...prev, { ...pinnedMsg, isPinned: true }];
                    });
                }
            }
        })

        socket.on('message:unpin-success', (data) => {
            console.log('Message unpinned:', data);
            if (currentChat && currentChat._id === data.conversationId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.message) {
                        return {
                            ...msg,
                            isPinned: false,
                            userPinned: data.userPinned
                        }
                    }
                    return msg;
                }));
                if (data.lastMessage) {
                    const newMessage = {
                        ...data.lastMessage,
                    }
                    setMessages(prev => {
                        const messageExists = prev.some(msg => msg._id === newMessage._id);
                        if (messageExists) {
                            return prev;
                        }
                        return [...prev, newMessage];
                    });
                }

                const pinnedMsg = messages.find(msg => msg._id === data.message);
                if (pinnedMsg) {
                    setPinnedMessages(prev => {
                        // Check if already in the list
                        const alreadyPinned = prev.some(p => p._id === pinnedMsg._id);
                        if (alreadyPinned) {
                            return prev.filter(p => p._id !== pinnedMsg._id);
                        }
                        return prev;
                    });
                }
            }
        });

        return () => {
            socket.off('chat:loaded');
            socket.off('group:created');
            socket.off('chat:created');
            socket.off('chat:update', handleChatUpdate);
            socket.off('group:removed', handleRemoveMembers);
            socket.off('group:left', handleRemoveMembers);
            socket.off('user:typing', handleUserTyping);
            socket.off('user:stopped-typing', handleUserStopTyping);
            socket.off('typing:users', handleTypingUsers);
            socket.off('message:new');
            socket.off('conversation:read');
            socket.off('message:react-success');
            socket.off('message:reply-success');
            socket.off('message:recall-success');
            socket.off('message:pin-success');
            socket.off('message:unpin-success');
            socket.off('user:entered');
            socket.off('conversation:update');
            if (typingTimout.current) {
                clearTimeout(typingTimout.current);
                typingTimout.current = null;
            }
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
                        // console.log('Fetched messages for conversation:', currentChat._id, response.data.data);
                        setMessages(response.data.data);
                    } else {
                        console.log('Error fetching messages:', response.data.message);
                        setMessages([]);
                    }
                } catch (error) {
                    console.log('Error fetching messages:', error);
                    setMessages([]);
                } finally {
                    setLoading(false);
                }
            } else if (currentChat && currentChat.isTemporary) {
                // For temporary conversations, start with empty messages
                console.log('Temporary conversation, starting with empty messages');
                setMessages([]);
                setLoading(false);
            } else {
                setMessages([]);
                setLoading(false);
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
            showAlert('Transfer admin successfully', 'success');
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
            showAlert('Transfer deputy admin successfully', 'success');
        } catch (error) {
            console.error('Error transferring deputy admin:', error);
        } finally {
            setLoading(false);
        }
    }
    const handleRecallDeputyAdmin = (deputyId) => {
        setShowEditMember(null);
        if (!currentChat) return;

        setLoading(true);

        try {
            socket.emit('recall:deputy', {
                conversationId: currentChat._id,
                currentUserId: user._id,
                deputyId: deputyId,
            });
            showAlert('Recall deputy admin successfully', 'success');
        } catch (error) {
            console.error('Error recalling deputy admin:', error);
        } finally {
            setLoading(false);
        }
    }
    //render message personalize
    const renderAddMessage = (message) => {
        // console.log('Render message:', message.metadata.action);
        if (!message.metadata) return null;
        const { action, department, changedBy, userChange } = message.metadata || {};
        if (message.metadata.action === 'message_pinned') {
            if (message.metadata.pinnedBy._id === user._id) {
                return <span className="italic text-neutral-400 flex items-center"><TbPinnedFilled /> You pinned message</span>
            } else {
                return <span className="italic text-neutral-400 flex items-center"><TbPinnedFilled /> {message.metadata.pinnedBy.name} pinned message</span>
            }
        }
        if (message.metadata.action === 'message_unpinned') {
            if (message.metadata.pinnedBy._id === user._id) {
                return <span className="italic text-neutral-400 flex items-center"><RiUnpinLine /> You unpinned message</span>
            } else {
                return <span className="italic text-neutral-400 flex items-center"><RiUnpinLine /> {message.metadata.pinnedBy.name} unpinned  message</span>
            }
        }

        if (message.metadata.action === 'header_assigned') {
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
                return `You removed ${userChange.name} from Department Head position`;
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
            return `${changedBy?.name || 'Someone'} removed ${user.name} from Deputy position`;
        }
        if (action === 'member_added') {
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
        if (action === 'member_removed') {
            const { removedBy, removedMembers } = message.metadata || {};
            const memberNames = removedMembers?.map(m => m.name).join(', ');
            if (removedBy?._id === user._id) {
                return `You removed ${memberNames}`;
            }
            if (removedMembers?.some(m => m._id === user._id)) {
                return `${removedBy?.name} removed you`;
            }
            return `${removedBy?.name} removed ${memberNames}`;
        }
        if (action === 'admin_transferred') {
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
        if (action === 'deputy_transferred') {
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
        if (action === 'member_left') {
            const { leftBy } = message.metadata || {};
            if (!leftBy) return null;
            return `${leftBy.name} left the group`;
        }
        if (action === 'group_info_updated') {
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
        // console.log('Selected files updated:', selectedFiles);
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

            // Tin nhắn sẽ được mã hóa ở backend, gửi plain text
            if (replyingTo) {
                socket.emit('reply:message', {
                    messageId: replyingTo._id,
                    content: inputMessage, // Gửi plain text
                    tempId: tempId,
                    attachments: attachments
                });
            } else {
                console.log("Attachments:", attachments);
                const messagePayload = {
                    conversationId: currentChat._id,
                    content: inputMessage, // Gửi plain text
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

    //Pinned message
    const handlePinMessage = (messageId) => {
        setActiveMessageId(null);
        socket.emit('pin:message', {
            messageId,
            conversationId: currentChat._id,
        })
    }

    const handleUnPinMessage = (messageId) => {
        console.log('Unpin message:', messageId);
        setActiveMessageId(null);
        socket.emit('unpin:message', {
            messageId,
            conversationId: currentChat._id,
        })
    }

    const scrollToMessagePin = (messageId) => {
        // Xóa highlight cũ
        if (highlightedMessageId) {
            const prevElement = document.getElementById(`message-${highlightedMessageId}`);
            if (prevElement) {
                prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            }
        }

        // Set ID mới và highlight
        setHighlightedMessageId(messageId);

        // Scroll và highlight element mới
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.classList.add('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.log("Element not found:", messageId);
        }
    }
    // Tạo hàm xử lý toggle pinned messages và clear highlight
    const togglePinnedMessages = () => {
        // Toggle state hiển thị pinned messages
        setShowPinnedMessages(!showPinnedMessages);

        // Clear highlight nếu có
        if (highlightedMessageId) {
            const prevElement = document.getElementById(`message-${highlightedMessageId}`);
            if (prevElement) {
                prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            }
            setHighlightedMessageId(null);
        }
    };
    const renderPinnedMessage = () => {
        const pinnedMessageList = messages.filter(msg => msg.isPinned);
        if (pinnedMessageList.length === 0) {
            return null;
        }
        return (
            <div className="sticky top-0 z-10 dark:bg-neutral-800 dark:border-neutral-700 px-8 py-1 rounded">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <BsPinAngle className="text-purple-500 mr-2" />
                        <h2 className="text-sm font-semibold">Pinned Messages</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="text-xs text-white bg-neutral-700 rounded-full w-6 h-5 flex items-center justify-center">
                            {pinnedMessageList.length}
                        </div>
                        <button
                            onClick={togglePinnedMessages}
                            className="text-neutral-400 hover:text-white transition-colors"
                        >
                            {showPinnedMessages ? <BsChevronUp /> : <BsChevronDown />}
                        </button>
                    </div>
                </div>
                {showPinnedMessages && (
                    <div className="mt-1 max-h-20 overflow-auto scrollbar-none">
                        {pinnedMessageList.map(msg => (
                            <div
                                key={`pinned-${msg._id}`}
                                className="flex items-center py-1 hover:bg-neutral-700 rounded px-2 group relative"
                            >
                                <div
                                    className="flex items-center flex-1 cursor-pointer"
                                    onClick={() => scrollToMessagePin(msg._id)}
                                >
                                    <div className="flex-shrink-0">
                                        <img
                                            src={msg.sender.avatar || "https://randomuser.me/api/portraits/men/32.jpg"}
                                            alt={msg.sender.name}
                                            className="w-6 h-6 rounded-full"
                                        />
                                    </div>
                                    <div className="ml-2 flex-1 truncate">
                                        <div className="text-xs font-semibold">{msg.sender.name}: {msg.content}</div>
                                    </div>
                                </div>
                                <div
                                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2 text-neutral-400 hover:text-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnPinMessage(msg._id);
                                    }}
                                    title="Unpin message"
                                >
                                    <RiUnpinLine />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

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
                prevElement.classList.remove('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            }
        }

        // Set ID mới và highlight
        setHighlightedMessageId(messageId);

        // Scroll và highlight element mới
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.classList.add('bg-neutral-200', 'dark:bg-neutral-700', 'rounded-lg', 'p-1');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.log("Element not found:", messageId);
        }
        scrollToMessagePin(messageId);
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

    }, [searchQuery]);

    //handle message rendering
    const renderMessage = (msg) => {
        if (msg.isRecalled) {
            if (msg.recallType === 'everyone') {
                return <span className="italic text-neutral-400">{
                    msg.sender._id === user._id ? 'You recalled a message' : `${msg.sender.name} recalled a message`
                }</span>
            } else if (msg.recallType === 'self') {
                return (
                    msg.sender._id === user._id ? (
                        <span className="italic text-neutral-400">You recalled your message</span>
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
            if (!contactUser) return null;
            return (
                <div className="flex items-center p-4 relative w-full">
                    <div className="flex items-center">
                        {contactUser?.avatar ? (
                            <div className="relative">
                                <img
                                    src={contactUser?.avatar}
                                    alt="User"
                                    className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
                                />
                                <div
                                    className={`w-3 h-3 ${contactUserStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'} 
                            rounded-full absolute right-0 bottom-0 border-2 border-white dark:border-neutral-900`}
                                    title={contactUserStatus === 'online' ? 'Online' : 'Offline'}>
                                </div>
                            </div>

                        ) : (
                            <div
                                className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold shadow-lg"
                                style={{ backgroundColor: getRandomColor() }}
                            >
                                {contactUser?.name.charAt(0).toUpperCase()}
                            </div>
                        )}                        <div className="ml-3">
                            <h2 className="text-lg font-semibold">
                                {contactUser?.name}
                            </h2>
                            <h3 className="text-xs text-gray-500 dark:text-gray-400">
                                {contactUser?.position} • {contactUser?.department?.name}
                            </h3>
                        </div>
                        {/* <div className={`w-2 h-2 ${contactUserStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'} 
                        rounded-full absolute left-12 top-12 transition-colors duration-300`}
                            title={contactUserStatus === 'online' ? 'Online' : 'Offline'}>
                        </div> */}
                    </div>
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
    useEffect(() => {
        if (messages && messages.length > 0) {
            const allImages = messages
                .flatMap(msg => msg.attachments || [])
                .filter(attachment => attachment && attachment.fileType === 'image')
                // Sort by timestamp if available, otherwise keep original order
                .sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return 0;
                });
            setImageAttachments(allImages);
        }
    }, [messages]);

    const handleOpenImageViewer = (image) => {
        setSelectedImage(image);
        setImageViewerOpen(true);
    };

    const handleCloseImageViewer = () => {
        setImageViewerOpen(false);
    }; const handleDownloadImage = (image) => {
        if (image && image._id) {
            handleFileDownload(image._id, image.fileName || `image-${image._id}`);
        }
    };
    const handleFileDownload = async (fileId, fileName) => {
        try {
            const downloadUrl = `http://localhost:5000/api/file/download/${fileId}`;

            // Fetch the file with proper headers
            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the blob data
            const blob = await response.blob();

            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            showAlert('Failed to download file', 'error');
        }
    };
    const handleCommonGroupClick = (group) => {
        setCurrentChat(group);
    };
    const renderInfoSidebar = () => {
        if (!currentChat) return null;

        if (currentChat.type === 'private') {
            const contactUser = currentChat.members?.find(member => member._id !== user._id);
            console.log('Contact user:', contactUser);
            return (
                <div className="w-[380px] bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-500 scrollbar-none">

                        {/* Enhanced Profile Header */}
                        <div className="relative group">
                            <div className="relative rounded-2xl mx-4 mt-4 overflow-hidden shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700">
                                <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/60"></div>
                                <img
                                    src={contactUser?.avatar}
                                    alt="User"
                                    className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105"
                                />

                                {/* Floating Action Button */}
                                <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-full hover:bg-white/30 transition-all duration-300 transform hover:scale-110 hover:rotate-12 flex items-center justify-center">
                                    <FaEllipsisV className="text-white text-sm" />
                                </button>

                                {/* Profile Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                    <div className="flex items-end space-x-4">
                                        <div className="w-16 h-16 rounded-full border-4 border-white/30 overflow-hidden shadow-lg backdrop-blur-sm">
                                            <img
                                                src={contactUser?.avatar}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 pb-1">
                                            <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
                                                {contactUser?.name}
                                            </h3>
                                            <div className={`flex items-center gap-2 ${contactUser?.status === 'online'
                                                ? 'text-emerald-300'
                                                : 'text-slate-300'
                                                }`}>
                                                <span className={`w-3 h-3 rounded-full ${contactUser?.status === 'online'
                                                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse'
                                                    : 'bg-slate-400'
                                                    }`}></span>
                                                <span className="font-medium text-sm drop-shadow-md">
                                                    {contactUser?.status === 'online' ? 'Active now' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Contact Information */}
                        <div className="px-6 py-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider uppercase">
                                    Contact Information
                                </h4>
                            </div>

                            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                                <div className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 p-3 rounded-xl transition-all duration-300 cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Email</p>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{contactUser?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 p-3 rounded-xl transition-all duration-300 cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Department</p>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{contactUser?.department?.name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 p-3 rounded-xl transition-all duration-300 cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Position</p>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{contactUser?.position}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Groups Section */}
                        <div className="px-6 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider uppercase">
                                    Groups in Common
                                </h4>
                            </div>

                            <div className="space-y-2">
                                {contactUser?.commonGroups && contactUser?.commonGroups.length > 0 ? (
                                    contactUser?.commonGroups?.map((group, index) => (
                                        <div
                                            key={index}
                                            className="group flex items-center space-x-3 p-3 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-all duration-300 transform hover:translate-x-1 hover:shadow-lg backdrop-blur-sm border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
                                            onClick={() => handleCommonGroupClick(group)}
                                        >
                                            <div className="relative">
                                                {group.type === 'group' ? (
                                                    <img
                                                        src={group.avatarGroup}
                                                        alt={group.name}
                                                        className="w-10 h-10 rounded-full shadow-md group-hover:shadow-lg transition-shadow duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-md group-hover:shadow-lg flex items-center justify-center text-white font-bold text-sm transition-transform duration-300 group-hover:scale-110">
                                                        {group.name.charAt(0).toUpperCase() + group.name.charAt(1).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300">
                                                    {group.type === 'department' ? '#' : ''} {group.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    {group.type === 'department' ? 'Department' : 'Group'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <span className="text-2xl text-slate-400">👥</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No groups in common</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Media Section */}
                        <div className="px-6 pb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider uppercase">
                                        Shared Media
                                    </h4>
                                </div>
                                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors duration-300">
                                    Show all
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {imageAttachments.slice(0, 6).map((attachment, index) => (
                                    <div
                                        className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"
                                        key={attachment._id || index}
                                        onClick={() => handleOpenImageViewer(attachment)}
                                    >
                                        <img
                                            src={attachment.fileUrl}
                                            alt={attachment.fileName || `Image ${index + 1}`}
                                            className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            <span className="text-white text-xs">📷</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Enhanced Files Section */}
                        <div className="px-6 pb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider uppercase">
                                    Shared Files
                                </h4>
                            </div>

                            <div className="space-y-3">
                                {messages.map(msg => msg.attachments).flat().filter(attachment =>
                                    attachment && attachment.fileType !== 'image'
                                ).map((attachment, index) => (
                                    <div
                                        key={attachment._id || index}
                                        className="group bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 transform hover:translate-y-[-2px] cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">

                                            <div className="flex-1 ">
                                                <RenderAttachment attachment={attachment} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                        {currentChat.type === 'group' && (
                            <button
                                className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full"
                                onClick={handleShowLeaveGroup}
                            >
                                <FaEllipsisV className="text-white" />
                            </button>
                        )}
                        {currentChat.type === 'group' && showLeaveGroup && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-10 right-0 dark:bg-neutral-800 text-black p-2 rounded-lg shadow-lg z-10 w-1/2 text-sm  transition-colors duration-200 space-y-2">
                                {currentChat.type === 'group' && (
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
                                )}
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
                        <div className="mt-2 space-y-3 overflow-y-auto max-h-96 scrollbar-none">
                            {sortedMembers?.map((member) => {
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
                                                                    onClick={() => handleTransferAdmin(member)}
                                                                >
                                                                    <CiEdit />
                                                                    <p>Assign Admin</p>
                                                                </button>
                                                                <button
                                                                    className="flex items-center space-x-2 text-xs hover:bg-neutral-600 rounded-lg w-full pl-2"
                                                                    onClick={() => handleRecallDeputyAdmin(member._id)}
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

                    <div className="py-5 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 tracking-wider">SHARED MEDIA</h4>
                            <button className="text-neutral-600 dark:text-neutral-400 text-xs font-medium hover:underline">Show all</button>
                        </div>
                        {imageAttachments.some(msg => msg.attachments).length > 0 ? imageAttachments.slice(0, 6).map((attachment, index) => (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                <div
                                    className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                                    key={attachment._id || index}
                                    onClick={() => handleOpenImageViewer(attachment)}
                                >
                                    <img
                                        src={attachment.fileUrl}
                                        alt={attachment.fileName || `Image ${index + 1}`}
                                        className="w-full h-20 object-cover"
                                    />
                                </div>
                            </div>
                        )) : (
                            <div className="text-neutral-500 font-semibold text-sm w-full text-center">No media shared yet</div>
                        )}
                    </div>
                    {/* Attached Files */}
                    <div className="py-5 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 tracking-wider mb-3">SHARED FILES</h4>
                        <div className="mt-2 space-y-3">
                            {messages.some(msg => msg.attachments).length > 0 ?
                                messages.map(msg => msg.attachments).flat().filter(attachment =>
                                    attachment && attachment.fileType !== 'image'
                                ).map((attachment, index) => (
                                    <div
                                        key={attachment._id || index}
                                        className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <RenderAttachment attachment={attachment} />
                                    </div>
                                )) : (
                                    <div className="text-neutral-500 font-semibold text-sm w-full text-center">No files shared yet</div>
                                )}
                        </div>
                    </div>
                </div>
            )
        }
        return null;
    }

    const FilePreview = () => {
        if (selectedFiles.length === 0) return null;

        const getFileIcon = (fileType) => {
            switch (fileType) {
                case 'image':
                    return <MdImage className="text-2xl text-blue-400" />;
                case 'pdf':
                    return <MdPictureAsPdf className="text-2xl text-red-500" />;
                case 'document':
                    return <MdDescription className="text-2xl text-blue-600" />;
                case 'spreadsheet':
                    return <MdTableChart className="text-2xl text-green-600" />;
                case 'presentation':
                    return <MdSlideshow className="text-2xl text-orange-500" />;
                case 'archive':
                    return <MdFolder className="text-2xl text-yellow-500" />;
                default:
                    return <MdFileUpload className="text-2xl text-gray-500" />;
            }
        };

        return (
            <div className="p-2 flex flex-wrap gap-2 ">
                {selectedFiles.map((file, index) => {
                    const fileType = getFileType(file.type);
                    const isImage = fileType === 'image';

                    return (
                        <div
                            key={index}
                            className="relative flex flex-col items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg p-2 border border-gray-200 dark:border-neutral-600"
                        >
                            {isImage ? (
                                <div className="w-fit h-20 mb-1 flex items-center justify-center overflow-hidden bg-neutral-200 dark:bg-neutral-800 rounded">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 mb-1 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded">
                                    {getFileIcon(fileType)}
                                </div>
                            )}

                            <span className="text-xs text-center text-gray-700 dark:text-white truncate w-full">
                                {file.name.length > 15 ? `${file.name.slice(0, 15)}...` : file.name}
                            </span>

                            <button
                                onClick={() => removeSelectedFile(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 rounded-full p-1 shadow-md"
                                aria-label="Remove file"
                            >
                                <MdClose className="text-sm" />
                            </button>

                            {isUploading && uploadProgress[index] !== undefined && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-b-lg" style={{
                                    width: `${uploadProgress[index]}%`,
                                    transition: 'width 0.3s ease'
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const inputMessageUI = () => {
        return (
            <div className="flex flex-col ">
                <FilePreview />
                <div className="py-3 px-4 border-gray-200 dark:border-gray-700 flex items-center space-x-3 bg-white dark:bg-neutral-900 ">
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
                        <MdAttachFile className="text-2xl hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full p-1 text-gray-600 dark:text-gray-400 transition-colors" />
                    </label>
                    <div className="relative">
                        <MdEmojiEmotions
                            className="text-2xl hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full p-1 text-gray-600 dark:text-gray-400 transition-colors"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        />
                        {showEmojiPicker && (
                            <div className="absolute bottom-10 left-0 z-10 shadow-xl rounded-lg" ref={emojiPickerRef} id="emoji-picker-wrapper">
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
                        onChange={(e) => {
                            setInputMessage(e.target.value)
                            if (e.target.value && currentChat?._id && !currentChat?.isTemporary) {
                                if (!typingTimout.current) {
                                    socket.emit('typing:start', {
                                        conversationId: currentChat._id,
                                    })
                                }
                                typingTimout.current = setTimeout(() => {
                                    typingTimout.current = null
                                }, 1000)
                            }
                        }} onBlur={() => {
                            if (currentChat?._id && !currentChat?.isTemporary) {
                                socket.emit('typing:stop', {
                                    conversationId: currentChat._id,
                                })
                                if (typingTimout.current) {
                                    clearTimeout(typingTimout.current)
                                    typingTimout.current = null
                                }
                            }
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && !isUploading && sendMessage(e)}
                        placeholder={isUploading ? "Uploading files..." : "Type a message..."}
                        className="flex-1 p-3 rounded-full dark:bg-neutral-800 dark:text-white bg-gray-100 outline-none border border-gray-200 dark:border-neutral-700 transition-all duration-300"
                        disabled={isUploading}
                    />
                    <button
                        className={`ml-2 p-3 ${isUploading ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white rounded-full shadow-md transition-all duration-300 ${!isUploading && 'hover:shadow-lg'}`}
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
        );
    };

    const TypingIndicator = ({ users }) => {
        if (!users || users.length === 0) return null;
        const uniqueUsers = Array.from(new Set(users.map(user => user._id)))
            .map(id => users.find(user => user._id === id));
        return (
            <div className="flex items-center text-xs text-neutral-400 ml-4 mb-1 mt-3 bg-neutral-900">
                <div className="flex space-x-1 mr-1">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>
                    {uniqueUsers.length > 1 ? `${uniqueUsers.length} people are typing...` : `${uniqueUsers[0].name} is typing...`}
                </span>
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
                <div
                    className="w-full max-w-xs relative group cursor-pointer"
                    onClick={() => handleOpenImageViewer(attachment)}
                >
                    <img
                        src={serverMediaUrl}
                        alt={fileName || "Image"}
                        className="w-full h-auto rounded transition-transform duration-200"

                    />
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
            <div className="flex items-center p-rounded-lg ">
                {/* <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-950 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                </div> */}
                <div className="mr-2">
                    {fileType === 'pdf' && <FaFilePdf className="text-red-500 text-2xl" />}
                    {fileType === 'document' && <FaFileWord className="text-blue-500 text-2xl" />}
                    {fileType === 'presentation' && <FaFilePowerpoint className="text-orange-500 text-2xl" />}
                    {fileType === 'spreadsheet' && <FaFileExcel className="text-green-500 text-2xl" />}
                    {fileType === 'archive' && <FaFileArchive className="text-yellow-500 text-2xl" />}
                    {!['pdf', 'document', 'presentation', 'spreadsheet', 'archive'].includes(fileType) && <FaFile className="text-gray-500 text-2xl" />}
                </div>                <div>
                    <button
                        onClick={() => handleFileDownload(_id, fileName)}
                        className="dark:text-neutral-300 hover:underline truncate max-w-[180px] text-left bg-transparent border-none cursor-pointer p-0"
                        title={`Download ${fileName}`}
                    >
                        {truncateFileName(fileName)}
                    </button>
                    <span className="ml-3 text-xs text-neutral-400">{formatFileSize(fileSize)}</span>
                </div>
            </div>
        );
    };

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

    const checkAdmin = currentChat?.members?.some(member => member._id === user._id && (member.role === 'admin' || member.role === 'deputy_admin' || member.permissionSystem?.manageDepartment === true));
    // console.log('Members:', currentChat?.members);

    return (
        <div className="flex h-full w-full dark:text-white overflow-hidden">
            <div className="dark:bg-neutral-900 w-[370px] bg-neutral-50 z-0 h-full overflow-y-auto scrollbar-none">
                {ComponentToRender && <ComponentToRender
                    setCurrentChat={setCurrentChat}
                    currentChat={currentChat}
                />}
            </div>

            <div
                className={`dark:bg-neutral-800 flex h-full transition-all duration-300 ${showInfo ? 'flex-[1.5]' : 'flex-[2.5]'} justify-center items-center overflow-hidden`}
            >
                {(() => {
                    return callState === 'receiving' && currenntCallInfo && (
                        <IncomingCallModal
                            callInfo={currenntCallInfo}
                            onAnswer={handleAnswerCall}
                            onDecline={handleDeclineCall}
                        />
                    );
                })()}
                <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 shadow-2xl border-none backdrop-blur-sm dark:text-white relative">                    {(callState === 'calling' || callState === 'inCall') && currenntCallInfo ? (
                    (() => {
                        const isInitiator = user._id === currenntCallInfo.initiator?._id;
                        const calculatedOtherParticipant = isInitiator
                            ? currenntCallInfo.otherParticipant
                            : currenntCallInfo.initiator;
                        return (
                            <IncallUI
                                callInfo={currenntCallInfo}
                                localStream={localStream}
                                remoteStream={remoteStream}
                                onEndCall={handleEndCall}
                                onToggleAudio={toggleAudio}
                                onToggleVideo={toggleVideo}
                                otherParticipant={calculatedOtherParticipant}
                                isCallAnswered={callState === 'inCall'}
                            />
                        );
                    })()
                ) : (
                    currentChat ? (
                        <>
                            <div className="flex justify-between items-center dark:border-gray-700 ">
                                {renderChatHeader()}
                                <div className="flex space-x-3 items-center justify-center mr-5">
                                    <button
                                        className="text-neutral-600 dark:text-neutral-300 hover:text-green-500 dark:hover:text-green-400 focus:outline-none text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleInitiateCall('voice')}
                                        title="Start Voice Call"
                                    >
                                        <FiPhone />
                                    </button>
                                    <button
                                        className="text-neutral-600 dark:text-neutral-300 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleInitiateCall('video')}
                                        title="Start Video Call"
                                    >
                                        <FiVideo />
                                    </button>
                                    <button
                                        className={`relative ${searchMode ? 'text-purple-500' : ''}`}
                                        onClick={toggleSearchMode}
                                    >
                                        <BsSearch />
                                    </button>
                                    {searchMode && (
                                        <div className="absolute top-16 right-0 z-20 dark:bg-neutral-800 rounded-lg shadow-lg p-1 flex flex-col w-full">
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
                            {renderPinnedMessage()}
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
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500 " key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'member_removed') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'admin_transferred') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'deputy_transferred') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'group_info_updated') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'message_pinned') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'message_unpinned') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'header_assigned') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'deputy_assigned') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'header_removed') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'deputy_removed') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            {renderAddMessage(msg)}
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'call_ended') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            <span className="italic text-neutral-400">{msg.content}</span>
                                                        </div>
                                                    )
                                                }
                                                if (msg.metadata?.action === 'call_missed') {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            <span className="italic text-neutral-400">{msg.content}</span>
                                                        </div>
                                                    )
                                                }
                                                // Handle call system messages (call ended, declined, etc.)
                                                if (msg.metadata?.callId) {
                                                    return (
                                                        <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                            <span className="italic text-neutral-400">{msg.content}</span>
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <div className="flex justify-center items-center mb-4 text-sm dark:text-neutral-500" key={msg._id}>
                                                        {msg.content}
                                                    </div>
                                                )
                                            }
                                            const isCurrentUser = msg.sender?._id === user._id;
                                            return (
                                                <div
                                                    id={`message-${msg._id}`}
                                                    key={msg._id}
                                                    className={`flex justify-${msg.sender?._id === user._id ? 'end' : 'start'} mb-4 ${msg._id === highlightedMessageId ? 'bg-neutral-200 dark:bg-neutral-800 rounded-xl' : ''
                                                        }`}
                                                >
                                                    {!isCurrentUser && (
                                                        <div className="flex flex-col item justify-center  space-y-2 items-center">
                                                            <img
                                                                src={msg.sender?.avatar || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                                alt={msg.sender?.name}
                                                                className="w-8 h-8 rounded-full mr-2"
                                                                title={msg.sender?.name}
                                                            />
                                                            {currentChat.type === 'department' || currentChat.type === 'group' && (
                                                                <div className="text-xs text-gray-400 font-semibold">{msg.sender?.name}</div>
                                                            )}
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
                                                                <div className={`relative max-w-xs rounded-2xl px-3 py-2 ${isCurrentUser
                                                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                                                    : 'bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 dark:text-white shadow-sm'}`}>                                                                    <div>
                                                                        {msg.content &&
                                                                            <div className="w-fit group">
                                                                                {renderMessage(msg)}
                                                                                {msg.reactions.length > 0 && (
                                                                                    <div
                                                                                        className={`absolute cursor-pointer -bottom-[10px] ${msg.sender?._id === user._id ? '-left-2' : '-right-2'} flex items-center justify-center space-x-1 dark:text-neutral-400 dark:bg-neutral-700 bg-neutral-200 rounded-full shadow-xl px-1`}
                                                                                        onClick={() => handleShowDetailReaction(msg._id)}
                                                                                    >
                                                                                        {Object.entries(reactionsMap).map(([emoji, data]) => (
                                                                                            <span
                                                                                                key={emoji}
                                                                                                className="text-[12px] cursor-pointer flex items-center dark:hover:bg-neutral-600 hover:bg-neutral-300  rounded-full"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleReaction(msg?._id, emoji);
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
                                                                                {!msg.isRecalled && (
                                                                                    <div className={`absolute top-3 ${msg.sender?._id === user._id ? '-left-20' : '-right-20'} flex items-center justify-center space-x-2 text-xs text-gray-400 
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
                                                                                                <div className={`absolute ${msg.sender._id === user._id ? 'right-5' : '-right-[90px]'} -top-3 bg-white dark:text-white dark:bg-neutral-700 rounded-lg shadow-md z-10 flex flex-col items-start w-20 space-y-1 px-1 py-1 option-menu`}>
                                                                                                    <button
                                                                                                        className="hover:bg-gray-100 dark:hover:bg-neutral-500 rounded-md transition-colors text-left w-full px-1"
                                                                                                        onClick={() => handlePinMessage(msg._id)}
                                                                                                    >
                                                                                                        Pin
                                                                                                    </button>
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
                                                                                )}
                                                                                {activeReaction === msg._id && (
                                                                                    <div className={`absolute flex ${msg.sender?._id === user._id ? '-right-5' : 'left-5'} -bottom-5 space-x-1 text-xs text-gray-400 bg-white dark:bg-neutral-500 opacity-90 p-1 rounded-full shadow-md z-10 reaction-menu`}>
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
                                                                        <div className={`absolute -bottom-5 right-0 w-48 flex items-center mt-1 text-[10px] font-mono ${isCurrentUser ? 'text-gray-500 justify-end' : 'text-gray-400 justify-start'}`}>
                                                                            {msg.sender?._id === user._id ? (
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
                                                    {isCurrentUser && (
                                                        <div className="items-center flex flex-col justify-center space-y-2">
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
                                            Replying to {replyingTo.sender?.name === user.name ? 'You' : replyingTo.sender?.name}
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

                            {currentChat && typingUsers[currentChat._id] && typingUsers[currentChat._id].length > 0 && (
                                <TypingIndicator users={typingUsers[currentChat._id]} />
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
                    )
                )}
                    {/* Header */}
                </div>
            </div>

            {showInfo && renderInfoSidebar()}
            <ImageViewerModal
                isOpen={imageViewerOpen}
                onClose={handleCloseImageViewer}
                initialImage={selectedImage}
                images={imageAttachments}
                onDownload={handleDownloadImage}
            />
        </div>
    );
});

export default Chat;

