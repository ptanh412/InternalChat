import { memo, useEffect, useMemo, useState } from "react";
import { CiSearch } from "react-icons/ci";
import axios from "axios";
import { useUser } from "../../context/UserContext";


const Contacts = memo(({setCurrentChat}) => {
    const [users, setUsers] = useState([]);
    const {user, socket} = useUser();
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/auth/get-user", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.data.success) {
                    const filteredUsers = response.data.data.users.filter(
                        u => u._id !== user._id
                    )
                    setUsers(filteredUsers);
                    console.log(filteredUsers);
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchUsers();
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
        const letters = '0123456789ABCDEF';
        return () => {
            let color = '#';

            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    });

    const handleContactClick = (contactUser) =>{
        console.log('Contact user: ', contactUser);
        socket.emit('chat:init', {contactId: contactUser._id});

        socket.once('chat:loaded', (data) =>{
            setCurrentChat({
                ...data.conversation,
                contactUser: contactUser
            })
        })
    }
    return (
        <div className="p-4 w-full z-0 mt-3">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Contact</h1>
            </div>
            <div className="mt-5 flex items-center">
                <div className="absolute flex items-center dark:text-white hover:text-gray-500 ml-2">
                    <CiSearch className="text-gray-400 text-3xl hover:bg-neutral-600 p-1 rounded-full" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-2 rounded-3xl w-full border border-gray-300 dark:border-neutral-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white"
                    placeholder="Search user..."
                />
            </div>
            <div className="mt-14 px-5">
                {Object.keys(sortedMembers).sort().map((letter) => (
                    <div key={letter} className="mt-3">
                        <h3 className="font-semibold text-lg text-purple-400 mb-3">{letter}</h3>
                        <div className="space-y-4 ml-3">
                            {sortedMembers[letter].map((member) => (
                                <div key={member._id} className="flex space-x-3" onClick={() => handleContactClick(member)}>
                                    <div className="flex space-x-5 items-center cursor-pointer">
                                        {member.avatar ? (
                                            <img src={member.avatar} className="w-5 h-5 rounded-full" alt="" />
                                        ) : (
                                            <div
                                                className="w-6 h-6 flex items-center justify-center rounded-full  text-white font-bold shadow-lg text-xs"
                                                style={{ backgroundColor: getRandomColor() }}
                                            >
                                                {member.name.charAt(0).toUpperCase() + member.name.charAt(1).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text- font-semibold">{member.name}</p>
                                            <p className="text-xs">{member.position} - {member.department.name}</p>
                                        </div>
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