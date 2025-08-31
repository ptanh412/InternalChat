import { CiSearch } from "react-icons/ci";
import { useState, useEffect } from "react";
import { MdGroupAdd } from "react-icons/md";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import { useChatContext } from "../../context/ChatContext";
import { useAlert } from '../../context/AlertContext';
import ReactDOM from 'react-dom';

const Groups = ({ setCurrentChat, setPendingGroupChat }) => {
    const { showAlert } = useAlert();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [groupName, setGroupName] = useState('');
    const { setCurrentComponent } = useChatContext();
    const { user, socket } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    const fetchUsers = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/auth/get-user", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                const filteredUsers = response.data.data.users.filter((u) => u._id !== user._id);
                setUsers(filteredUsers);
            }
        } catch (error) {
            console.log(error);
        }
    }
    
    const fetchGroups = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/conversation/user/${user._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                setGroups(response.data.data);
            }
        } catch (error) {
            console.log(error);
        }
    }
    
    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, []);

    const sortedMembers = users.reduce((acc, member) => {
        const firstLetter = member.name.charAt(0).toUpperCase();
        if (!acc[firstLetter]) {
            acc[firstLetter] = [];
        }
        acc[firstLetter].push(member);
        return acc;
    }, {});

    const toggleMemberSelection = (member) => {
        setSelectedMembers((prev) => ({
            ...prev,
            [member._id]: {
                selected: !prev[member._id]?.selected,
                memberData: member
            }        }));
    };
    
    const handleCreateGroup = async (name) => {
        // if (isCreatingGroup) return; // Prevent double-clicks
        
        if (!name.trim()) {
            showAlert('Please enter a group name', 'error');
            return;
        }
        
        const selectedMemberIds = Object.keys(selectedMembers)
            .filter((memberId) => selectedMembers[memberId].selected);
            
        if (selectedMemberIds.length === 0) {
            showAlert('Please select at least one member', 'error');
            return;
        }

        setIsCreatingGroup(true);
        
        // // Set a timeout to reset loading state if no response in 10 seconds
        // const timeoutId = setTimeout(() => {
        //     setIsCreatingGroup(false);
        //     showAlert('Group creation timed out. Please try again.', 'error');
        // }, 10000);
        
        // try {
            socket.emit("create:conversation-group", {
                members: selectedMemberIds,
                conversationName: name,
                creator: user._id,
                type: "group"
            });
            showAlert('Creating group...', 'info');
            setIsCreatingGroup(false);
            setShowForm(false);
            
        //     // Store timeout ID so we can clear it in the success/error handlers
        //     window.groupCreationTimeout = timeoutId;
            
        // } catch (error) {
        //     clearTimeout(timeoutId);
        //     console.error('Error creating group:', error);
        //     showAlert('Failed to create group. Please try again.', 'error');
        //     setIsCreatingGroup(false);
        // }
    }

    useEffect(() => {
        if (!socket) return;

        socket.on('group:created', (data) => {
            // Robustly check if current user is in the new group's members (handle both {_id} and string)
            const isCurrentUserMember = data.newConversation.members.some(m => {
                if (typeof m === 'string') return m === user._id;
                if (typeof m === 'object' && m !== null) return m._id === user._id || m._id?.toString() === user._id;
                return false;
            });
            if (!isCurrentUserMember) return;

            const newGroup = {
                _id: data._id,
                conversationInfo: {
                    _id: data._id,
                    type: 'group',
                    name: data.conversationInfo.name,
                    members: data.newConversation.members,
                    avatarGroup: data.conversationInfo.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
                },                unreadCount: data.newConversation.creator === user._id ? 0 : 1,
            };
            setGroups((prev) => {
                // Prevent duplicate
                if (prev.some(g => g._id === newGroup._id)) return prev;
                return [...prev, newGroup]
            });            setShowForm(false);
            setGroupName('');
            setSelectedMembers({});
            setIsCreatingGroup(false); // Reset loading state
            
            // Clear timeout if it exists
            if (window.groupCreationTimeout) {
                clearTimeout(window.groupCreationTimeout);
                window.groupCreationTimeout = null;
            }
            
            showAlert('Group created successfully', 'success');

            // If current user is the creator, set pending group chat and switch
            if (data.newConversation.creator === user._id) {
                if (setPendingGroupChat) {
                    setPendingGroupChat(data.newConversation);
                }
                setCurrentComponent('ConversationList');
            }        });        socket.on('group:create-error', (error) => {
            console.error('Group creation failed:', error);
            setIsCreatingGroup(false);
            
            // Clear timeout if it exists
            if (window.groupCreationTimeout) {
                clearTimeout(window.groupCreationTimeout);
                window.groupCreationTimeout = null;
            }
            
            showAlert(error.message || 'Failed to create group. Please try again.', 'error');
        });        return () => {
            socket.off('group:created');
            socket.off('group:create-error');
            
            // Clear timeout on cleanup
            if (window.groupCreationTimeout) {
                clearTimeout(window.groupCreationTimeout);
                window.groupCreationTimeout = null;
            }
        }
    }, [socket, user._id, setCurrentComponent, setPendingGroupChat, showAlert]);

    const handleContactClick = (group) => {
        setCurrentChat(group.conversationInfo);
        socket.emit('chat:init', {
            contactId: group.conversationInfo._id,
            conversationType: group.conversationInfo.type,
            conversationInfo: group.conversationInfo,
        });
    }

    const filteredGroups = groups.filter(group => 
        group.conversationInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 w-full z-0 mt-3 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm h-full">
            {/* Header Section with Gradient Background */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-800 to-indigo-900 p-3 rounded-lg shadow-md mb-5">
                <h1 className="text-2xl font-bold text-white">Groups</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center"
                    title="Create new group"
                >
                    <MdGroupAdd className="text-xl" />
                </button>
            </div>

            {/* Search Bar with Enhanced Styling */}
            <div className="mt-2 mb-6 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <CiSearch className="text-gray-400 text-xl" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-3 rounded-xl w-full border-2 border-gray-200 dark:border-neutral-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 transition-all duration-200 dark:bg-neutral-800 dark:text-white shadow-sm"
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Group Modal Portal */}
            {showForm && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className="p-8 rounded-xl w-[500px] dark:bg-neutral-900 bg-white shadow-2xl space-y-5 border-2 border-indigo-500/30 animate-fadeIn">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-800 flex items-center">
                            <MdGroupAdd className="mr-2 text-indigo-500" /> Create Group Conversation
                        </h2>
                        
                        {/* Group Name Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Group Name"
                                className="w-full p-3 rounded-xl mb-4 dark:bg-neutral-800 bg-gray-100 dark:text-white text-gray-800 outline-none border-2 border-transparent focus:border-indigo-500 transition-all duration-300"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                        
                        {/* Member Selection Section */}
                        <div className="space-y-3">
                            <h3 className="font-semibold mb-2 dark:text-white text-gray-800">Group Members</h3>
                            <button 
                                className="font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors duration-300 flex items-center"
                                onClick={() => setShowMembers(!showMembers)}
                            >
                                {showMembers ? "Hide Members" : "Select Members"}
                            </button>
                            
                            {/* Members List */}
                            {showMembers && (
                                <div className="mt-4 space-y-5 text-sm dark:bg-neutral-800 bg-gray-100 p-5 rounded-xl border-2 border-indigo-500/20 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {Object.keys(sortedMembers).sort().map((letter) => (
                                        <div key={letter} className="space-y-4">
                                            <h3 className="text-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg w-fit px-3 py-1 rounded-full">
                                                {letter}
                                            </h3>
                                            <div className="space-y-4 ml-3">
                                                {sortedMembers[letter].map((member) => (
                                                    <div key={member._id} className="flex items-center space-x-3 p-2 hover:bg-indigo-100 dark:hover:bg-neutral-700 rounded-lg transition-colors duration-200" >
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-indigo-600"
                                                            checked={selectedMembers[member._id]?.selected || false}
                                                            onChange={() => toggleMemberSelection(member)}
                                                        />
                                                        <div className="flex space-x-3 items-center">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-col">
                                                                <p className="text-base font-medium dark:text-white text-gray-800">{member.name}</p>
                                                                <p className="text-xs dark:text-gray-300 text-gray-500">
                                                                    {member.position} - {member.department?.name || 'Unknown Dept'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors duration-300 font-medium"
                            >
                                Cancel
                            </button>                            <button
                                className={`px-5 py-2 rounded-xl transition-all duration-300 font-medium shadow-md flex items-center space-x-2 ${
                                    isCreatingGroup 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                } text-white`}
                                onClick={() => handleCreateGroup(groupName)}
                                disabled={isCreatingGroup}
                            >
                                {isCreatingGroup && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                )}
                                <span>{isCreatingGroup ? 'Creating...' : 'Create Group'}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Groups List with Enhanced Styling */}
            <div className="mt-4 space-y-2">
                {filteredGroups.length === 0 ? (
                    <div className="text-center p-8 dark:text-gray-400 text-gray-500">
                        {searchTerm ? "No groups match your search" : "No groups available"}
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        (group.conversationInfo?.type === 'department' || group.conversationInfo?.type === 'group') && (
                            <div
                                key={group._id}
                                className="p-4 rounded-xl dark:hover:bg-neutral-800 hover:bg-gray-100 cursor-pointer mb-3 transition-all duration-200 border-l-4 border-indigo-500 dark:bg-neutral-900/50 bg-white shadow-sm hover:shadow-md"
                                onClick={() => handleContactClick(group)}
                            >
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full 
                                            ${group.conversationInfo.type === 'department' 
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                                : 'bg-gradient-to-r from-purple-500 to-indigo-600'} 
                                            text-white font-bold shadow-lg`}>
                                            {group.conversationInfo.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-base font-semibold flex items-center">
                                                {group.conversationInfo.type === 'department' && (
                                                    <span className="text-emerald-500 mr-1">#</span>
                                                )}
                                                {group.conversationInfo.name}
                                            </p>
                                            <p className="text-xs dark:text-gray-400 text-gray-500">
                                                {group.conversationInfo.type === 'department' 
                                                    ? `Department ${group.conversationInfo.departmentId?.name || ''} - ${group.conversationInfo.members?.length || 0} members` 
                                                    : `${group.conversationInfo.members?.length || 0} members`}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {group.unreadCount > 0 && (
                                        <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-2.5 py-0.5 text-xs font-medium animate-pulse">
                                            {group.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    ))
                )}
            </div>
        </div>
    );
}

export default Groups;