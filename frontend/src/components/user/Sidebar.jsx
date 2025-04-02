import { CiChat2, CiBrightnessDown, CiDark, CiLight } from "react-icons/ci";
import { MdVpnKey } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { TiMessageTyping } from "react-icons/ti";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { RiContactsBook3Line } from "react-icons/ri";
import { CiSettings } from "react-icons/ci";
import { FaRegUser, FaSun } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";
import { useTheme } from '../../context/ThemeContext';
import { useUser } from "../../context/UserContext";


const Sidebar = ({ setCurrentComponent }) => {

    const [showMenu, setShowMenu] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const menuRef = useRef(null);
    const handleShowMenu = () => {
        setShowMenu(!showMenu);
    }
    const {user, logout} = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        }

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMenu]);
    const navItems = [
        { name: 'Conversation List', icon: <TiMessageTyping />, component: 'ConversationList' },
        { name: 'Groups', icon: <HiOutlineUserGroup />, component: 'Groups' },
        { name: 'Contacts', icon: <RiContactsBook3Line />, component: 'Contacts' },
        { name: 'Profile', icon: <FaRegUser />, component: 'Profile' },
    ];

    const handleLogout = () =>{
        navigate('/login');
        logout();
    }
    return (
        <div className={`h-screen bg-white dark:bg-black shadow-2xl transition-all duration-300 overflow-hidden p-5 flex flex-col justify-between`}>
            <div className={`text-3xl font-bold dark:text-white flex items-center text-center justify-center mt-10 `}>
                <CiChat2 />
            </div>
            <div className="space-y-4 mb-[70px]">
                <ul className={`space-y-14 text-base cursor-pointer px-0`}>
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setCurrentComponent(item.component)}
                            className={`flex items-center justify-center px-1 py-2 space-x-2 rounded-lg transition-colors duration-300 
                            hover:bg-blue-100 hover:text-blue-500 dark:hover:bg-blue-900/50 dark:text-gray-200 dark:hover:text-blue-300`}
                        >
                            <div className={'text-2xl'}>{item.icon}</div>
                        </button>
                    ))}
                </ul>
            </div>
            <div className="flex items-center justify-center mb-7 relative">
                <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" onClick={handleShowMenu} />

            </div>
            {showMenu && (
                <div ref={menuRef} className="absolute w-48 left-16 bottom-1 bg-white dark:bg-neutral-800  shadow-lg rounded-lg p-2 Z-20 dark:text-white">
                    <button
                        onClick={toggleTheme}
                        className='text-gray-700 w-full dark:text-gray-300 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200 flex items-center space-x-2'
                    >
                        {theme === 'dark' ? (
                            <>
                                <CiLight className='' />
                                <p>Light mode</p>
                            </>

                        ) : (
                            <>
                                <CiDark className="" />
                                <p>Dark mode</p>
                            </>
                        )}
                    </button>
                    <Link to="/settings" className="flex items-center space-x-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                        <CiSettings />
                        <span>Settings</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center space-x-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                        <MdVpnKey />
                        <span>Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default Sidebar;