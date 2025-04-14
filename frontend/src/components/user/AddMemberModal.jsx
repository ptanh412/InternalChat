import { useEffect, useState } from "react"
import axios from "axios";
import { useUser } from "../../context/UserContext";

const AddMemberModal = ({ onClose, onAddMembers, currentMembers }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const {user} = useUser();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/auth/get-user", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.data.success) {
                    let filteredUsers = response.data.data.users.filter((u) => u._id !== user._id);
                    const currentMemberIds = currentMembers.map(member => member._id);

                    filteredUsers = filteredUsers.filter((u) => !currentMemberIds.includes(u._id));
                    if (searchTerm.trim() !== "") {
                        filteredUsers = filteredUsers.filter((user) => {
                            const fullName = `${user.name}`.toLowerCase();
                            return fullName.includes(searchTerm.toLowerCase());
                        });
                    }
                    setUsers(filteredUsers);``
                    console.log(filteredUsers);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [searchTerm, currentMembers]);

    const toggleUserSelection = (user) => {
        if (selectedUsers.some(u => u._id === user._id)) {
            setSelectedUsers(prev => prev.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    }

    const handleSubmit = () => {
        onAddMembers(selectedUsers);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="dark:bg-neutral-700 bg-neutral-100 rounded-lg p-6 w-96 max-w-full">
                <h3 className="dark:text-white text-lg font-medium mb-3">Add Members</h3>
                <input
                    type="text"
                    placeholder="Search for users..."
                    className="w-full p-2 mb-4 rounded-md dark:bg-neutral-800 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div>
                    {loading ? (
                        <div>
                            <p className="text-center dark:text-white dark:bg-neutral-600">Loading...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div>

                        </div>
                    ) : (
                        users.map(user => (
                            <div
                                key={user._id}
                                className={`flex items-center p-2 rounded mb-1 cursor-pointer ${selectedUsers.some(u => u._id === user._id)
                                        ? 'bg-green-800 bg-opacity-30'
                                        : 'dark:hover:bg-neutral-600 hover:bg-neutral-200'
                                    }`}
                                onClick={() => toggleUserSelection(user)}
                            >
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full mr-2"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full dark:bg-neutral-500 bg-purple-200 mr-3 flex items-center justify-center">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="dark:text-white">{user.name}</p>
                                    <p className="text-neutral-400 text-sm">{user.position} - {user.department.name}</p>
                                </div>

                                {selectedUsers.some(u => u._id === user._id) && (
                                    <div className="ml-auto text-green-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        className="px-4 py-2 bg-neutral-700 text-white rounded-md hover:bg-neutral-600 mr-2"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 bg-green-600 text-white rouned ${selectedUsers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} rounded-md hover:bg-green-500`}
                        onClick={handleSubmit}
                        disabled={selectedUsers.length === 0}
                    >
                        Add {selectedUsers.length} {selectedUsers.length > 1 ? "Members" : "Member"}  
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddMemberModal;