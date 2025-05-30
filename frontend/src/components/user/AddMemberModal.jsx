import { useCallback, useEffect, useState } from "react"
import axios from "axios";
import { useUser } from "../../context/UserContext";

const AddMemberModal = ({ onClose, onAddMembers, currentMembers }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const {user} = useUser();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
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
                    setUsers(filteredUsers);
                    console.log(filteredUsers);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [currentMembers, user._id]);


    const handleSearch = useCallback((term) => {
        setSearchTerm(term);

        if (term.trim() === "") {
            setFilteredUsers(users);
        }else {
            const filtered = users.filter((user) => {
                const fullName = `${user.name}`.toLowerCase();
                return fullName.includes(term.toLowerCase());
            });

            setFilteredUsers(filtered);
        }
    }, [users]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, handleSearch]);
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="animate-fade-up animate-once animate-duration-300 w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden transform transition-all">
                {/* Header */}
                <div className="px-6 py-4 bg-indigo-600 dark:bg-indigo-700 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Members
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search Box */}
                <div className="px-6 pt-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search for users..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-700 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-200 transition-colors"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="px-6 py-4 max-h-64 overflow-auto scrollbar-none">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-3 text-indigo-500 dark:text-indigo-400">Loading users...</span>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="mt-2 text-gray-500 dark:text-gray-300">No users found</p>
                            <p className="text-sm text-gray-400 dark:text-gray-400">Try a different search term</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map(user => (
                                <div
                                    key={user._id}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all transform hover:scale-[1.02] ${
                                        selectedUsers.some(u => u._id === user._id)
                                            ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700'
                                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    onClick={() => toggleUserSelection(user)}
                                >
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-lg border-2 border-indigo-200 dark:border-indigo-700">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="ml-3 flex-1">
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {user.position} • {user.department.name}
                                        </p>
                                    </div>

                                    <div className={`ml-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                        selectedUsers.some(u => u._id === user._id) 
                                            ? 'bg-indigo-500 text-white' 
                                            : 'bg-gray-200 dark:bg-slate-600'
                                    }`}>
                                        {selectedUsers.some(u => u._id === user._id) ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <span className="w-3 h-3 rounded-full bg-white dark:bg-slate-800"></span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selection info */}
                {selectedUsers.length > 0 && (
                    <div className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-t border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center text-indigo-700 dark:text-indigo-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{selectedUsers.length} {selectedUsers.length > 1 ? "members" : "member"} selected</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-600">
                    <button
                        className="px-4 py-2 bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors shadow-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors ${
                            selectedUsers.length === 0 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:shadow-md'
                        }`}
                        onClick={handleSubmit}
                        disabled={selectedUsers.length === 0}
                    >
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add {selectedUsers.length > 0 ? `(${selectedUsers.length})` : "Members"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddMemberModal;