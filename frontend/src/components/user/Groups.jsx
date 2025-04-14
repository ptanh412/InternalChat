import { CiSearch } from "react-icons/ci";
import { useState, useEffect } from "react";
import { MdGroupAdd } from "react-icons/md";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import { useChatContext } from "../../context/ChatContext";

const Groups = ({setPendingGroupChat}) => {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [groupName, setGroupName] = useState('');
    const {setCurrentComponent} = useChatContext();
    const { user, socket } = useUser();

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
                // setUsers(response.data.data.users);
                console.log(filteredUsers);
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
                console.log(response.data.data);
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
            }
        }));
    }

    const handleCreateGroup = async (name) => {
        const selectedMemberIds = Object.keys(selectedMembers)
            .filter((memberId) => selectedMembers[memberId].selected);
        socket.emit("create:conversation-group", {
            members: selectedMemberIds,
            conversationName: name,
            creator: user._id,
            type: "group"
        });
    }

    useEffect(() => {
        if (!socket) return;

        socket.on('group:created', (data) => {
            console.log('Group received:', data);
            const newGroup = {
                _id: data._id,
                conversationInfo: {
                    type: 'group',
                    name: data.conversationInfo.name,
                    members: data.newConversation.members,
                },
                unreadCount: data.newConversation.creator === user._id ? 0 : 1,
            }
            setGroups((prev) => {
                return [...prev, newGroup]
            });
            console.log('Group created:', newGroup);
            setShowForm(false);
            setGroupName('');
            setSelectedMembers({});

            if (data.newConversation.creator === user._id){
                if (setPendingGroupChat) {
                    setPendingGroupChat(data.newConversation);
                }
                setCurrentComponent('ConversationList');
            }
        })

        return () => {
            socket.off('group:created');
        }
    }, [socket, user._id, setCurrentComponent, setPendingGroupChat]);

    return (
        <div className="p-4 w-full z-0 mt-3">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Groups</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className=" dark:text-white p-2 rounded-lg mt-3"
                >
                    <MdGroupAdd className="text-xl" />
                </button>
            </div>
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-8 rounded-lg w-[500px] dark:bg-neutral-900 bg-neutral-100 space-y-5`}>
                        <h2 className="text-2xl font-bold mb-4">Create Group Conversation</h2>
                        <input
                            type="text"
                            placeholder="Group Name"
                            className={`w-full p-2 rounded-xl mb-4 dark:bg-neutral-700 dark:text-white outline-none`}
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                        <h3 className="font-semibold mb-2">Group Members</h3>
                        <div>
                            <button className="font-semibold dark:bg-neutral-700 bg-neutral-200 px-3 text-sm py-1 rounded-full hover:dark:bg-neutral-600 hover:bg-neutral-300 transition-colors duration-300" onClick={() => setShowMembers(!showMembers)}>Select Members</button>
                            {showMembers && (
                                <div className="mt-4 space-y-5 text-sm dark:bg-neutral-800 bg-neutral-200 p-5 rounded-lg">
                                    {Object.keys(sortedMembers).sort().map((letter) => (
                                        <div key={letter} className="space-y-4">
                                            <h3 className="text-xl bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg  w-fit px-2 rounded-full">{letter}</h3>
                                            <div className="space-y-4 ml-3">
                                                {sortedMembers[letter].map((member) => (
                                                    <div key={member.name} className="flex space-x-3" >
                                                        <input
                                                            type="checkbox"
                                                            className="w-3 h-3 mt-2"
                                                            checked={selectedMembers[member.name]}
                                                            onChange={() => toggleMemberSelection(member)}
                                                        />
                                                        <div className="flex pace-x-2 flex-col">
                                                            <p className="text-lg font-semibold">{member.name}</p>
                                                            <p className="text-xs text-zinc-00">{member.position} - {member.department.name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4 text-white font-semibold">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-red-500 rounded-full"
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded-full"
                                onClick={() => handleCreateGroup(groupName)}
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-5 flex items-center">
                <div className="absolute flex items-center dark:text-white hover:text-gray-500 ml-2">
                    <CiSearch className="text-gray-400 text-3xl hover:bg-neutral-600 p-1 rounded-full" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-2 rounded-3xl w-full border border-gray-300 dark:border-neutral-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white"
                    placeholder="Search group..."
                />
            </div>
            <div className="mt-14">
                {groups.map((group) => (
                    group.conversationInfo?.type === 'department' ? (
                        <div
                            key={group._id}
                            className="p-3 rounded-lg dark:hover:bg-neutral-800 hover:bg-neutral-300 cursor-pointer mb-4"
                        >
                            <div className="flex items-center w-full space-x-3 justify-between">
                                <div className="relative mr-3 flex space-x-5 items-center">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg ">
                                        {group.conversationInfo.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        {group.conversationInfo.type === 'department' ? (
                                            <>
                                                <p className="text-base font-semibold">#{group.conversationInfo.name}</p>
                                            </>
                                        ) : (
                                            <p className="text-base font-semibold">{group.conversationInfo.name}</p>
                                        )}
                                        <p className="text-[10px] text-zinc-00">Department {group.conversationInfo.departmentId.name} - {group.conversationInfo.members.length} members</p>
                                    </div>

                                </div>
                                {group.unreadCount > 0 && (
                                    <p className="bg-red-800 bg-opacity-35 rounded-full px-2 text-pink-500 text-xs font-semibold">
                                        {group.unreadCount}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : group.conversationInfo?.type === 'group' && (
                        <div
                            key={group._id}
                            className="p-3 rounded-lg dark:hover:bg-neutral-800 hover:bg-neutral-300  cursor-pointer mb-4"
                        >
                            <div className="flex items-center w-full space-x-3 justify-between">
                                <div className="relative mr-3 flex space-x-5 items-center">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-900 bg-opacity-20 text-purple-400 font-bold shadow-lg ">
                                        {group.conversationInfo.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        {group.conversationInfo.type === 'department' ? (
                                            <>
                                                <p className="text-base font-semibold">#{group.conversationInfo.name}</p>
                                            </>
                                        ) : (
                                            <p className="text-base font-semibold">{group.conversationInfo.name}</p>
                                        )}
                                        <p className="text-[10px] text-zinc-00">{group.conversationInfo.members.length} members</p>
                                    </div>
                                </div>
                                {group.unreadCount > 0 && (
                                    <p className="bg-red-800 bg-opacity-35 rounded-full px-2 text-pink-500 text-xs font-semibold">
                                        {group.unreadCount}
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}

export default Groups;