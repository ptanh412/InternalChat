import { memo, useEffect, useMemo, useState, useRef } from "react";
import { useUser } from "../../context/UserContext";

const Contacts = memo(({setCurrentChat}) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const {user, socket} = useUser();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Giả định chúng ta đã có axios được import từ module chính của ứng dụng
                const response = await fetch("http://localhost:5000/api/auth/get-user", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const filteredUsers = data.data.users.filter(
                        u => u._id !== user._id
                    )
                    setUsers(filteredUsers);
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchUsers();

        // Xử lý khi click ngoài dropdown để đóng
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
                inputRef.current && !inputRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [user._id]);

    const sortedMembers = useMemo(() => {
        return users.reduce((acc, member) => {
            const firstLetter = member.name.charAt(0).toUpperCase();
            if (!acc[firstLetter]) {
                acc[firstLetter] = [];
            }
            acc[firstLetter].push(member);
            return acc;
        }, {});
    }, [users]);

    const getRandomColor = useMemo(() => {
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
        ];
        return () => colors[Math.floor(Math.random() * colors.length)];
    }, []);

    const handleContactClick = (contactUser) => {
        console.log('Contact user: ', contactUser);
        socket.emit('chat:init', {contactId: contactUser._id, conversationType: 'private'});
        setIsDropdownOpen(false);
        setSearchTerm("");
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm.trim()) return [];
        
        return users.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (member.position && member.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (member.department && member.department.name && 
             member.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const handleSearchFocus = () => {
        if (searchTerm.trim()) {
            setIsDropdownOpen(true);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(e.target.value.trim() !== "");
    };

    const getInitials = (name) => {
        if (!name) return "??";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="p-6 w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                    <div className="relative">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 w-3 h-8 rounded-full inline-block shadow-lg"></span>
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 w-3 h-8 rounded-full inline-block animate-pulse opacity-75"></span>
                    </div>
                    Contacts
                </h1>
            </div>
            
            {/* Search Input with Dropdown */}
            <div className="mt-5 relative">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="pl-10 pr-4 py-3 rounded-full w-full border border-gray-300 dark:border-neutral-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white shadow-sm"
                        placeholder="Search for contacts..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                    />
                </div>
                
                {/* Dropdown Results */}
                {isDropdownOpen && (
                    <div 
                        ref={dropdownRef}
                        className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 scrollbar-none"
                    >
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((member) => (
                                <div 
                                    key={member._id} 
                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                                    onClick={() => handleContactClick(member)}
                                >
                                    <div className="flex items-center space-x-3">
                                        {member.avatar ? (
                                            <img 
                                                src={member.avatar} 
                                                className="w-10 h-10 rounded-full object-cover" 
                                                alt={member.name} 
                                            />
                                        ) : (
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-medium ${getRandomColor()}`}>
                                                {getInitials(member.name)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-white">{member.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {member.position} {member.department && `- ${member.department.name}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No results found for "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Contact List */}
            <div className="mt-8">
                {Object.keys(sortedMembers).sort().map((letter) => (
                    <div key={letter} className="mb-6">
                        <h3 className="font-semibold text-lg text-purple-500 mb-2 px-2">{letter}</h3>
                        <div className="space-y-3">
                            {sortedMembers[letter].map((member) => (
                                <div 
                                    key={member._id} 
                                    className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                                    onClick={() => handleContactClick(member)}
                                >
                                    {member.avatar ? (
                                        <img 
                                            src={member.avatar} 
                                            className="w-10 h-10 rounded-full object-cover" 
                                            alt={member.name} 
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-medium ${getRandomColor()}`}>
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                    <div className="ml-3">
                                        <p className="font-medium text-gray-800 dark:text-white">{member.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {member.position} {member.department && `- ${member.department.name}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default Contacts;