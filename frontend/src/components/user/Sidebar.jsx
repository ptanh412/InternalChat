import { CiBrightnessDown } from "react-icons/ci";
import { MdOutlineManageAccounts, MdVpnKey } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { TiMessageTyping } from "react-icons/ti";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { RiContactsBook3Line } from "react-icons/ri";
import { FaRegUser, FaSun } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";
import { useTheme } from '../../context/ThemeContext';
import { useUser } from "../../context/UserContext";
import iconChat from "../../assets/messenger.png";
import { MdOutlineVpnKey } from "react-icons/md";
import ChangePassword from "./ChangePassword";
import { IoMdNotifications } from "react-icons/io";
import NotificationPanel from "./NotificationPanel";
import { useNotification } from "../../context/NotificationContext";
import { IoIosSwitch } from "react-icons/io";
import { useChatContext } from "../../context/ChatContext";

const Sidebar = ({ setCurrentComponent }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [showNotification, setShowNotification] = useState(false);
    const notificationRef = useRef(null);
    const menuRef = useRef(null);
    const { currentComponent } = useChatContext();
    const handleShowMenu = () => {
        setShowMenu(!showMenu);
    }
    const { user, logout } = useUser();
    // console.log("user:", user);
    // console.log("User position:", user.position);
    // console.log("User role:", user.role.permissions.manageUsers);
    const navigate = useNavigate();
    const { unreadCount, markAllAsRead } = useNotification();
    // console.log('Unread count from sidebar:', unreadCount);

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
        { name: 'Conversation List', icon: <TiMessageTyping />, component: 'ConversationList', path:'/chat' },
        { name: 'Groups', icon: <HiOutlineUserGroup />, component: 'Groups',path:'/chat' },
        { name: 'Contacts', icon: <RiContactsBook3Line />, component: 'Contacts',path:'/chat' },
        { name: 'Profile', icon: <FaRegUser />, component: 'Profile',path:'/chat' },
    ];

    const handleLogout = () => {
        navigate('/login');
        logout();
    }
    const handleNavigateToManageDepartment = () => {
        navigate('/manage-department');
    }

    const handleNavigateToAdminHome = () => {
        navigate('/admin-home');
        setShowMenu(false);
    }

    const handleNavItemClick =(item) =>{
        if (location.pathname !== '/chat') {
            navigate(item.path);
        }

        setCurrentComponent(item.component);
    }

    const handleShowPasswordForm = () => {
        setShowPasswordForm(!showPasswordForm);
        setShowMenu(false);
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!showNotification) return;

            const isToggleButton = event.target.closest('[data-notification-toggle="true"]');
            if (isToggleButton) return;

            const isInsidePanel = notificationRef.current && notificationRef.current.contains(event.target);
            if (isInsidePanel) return;

            setShowNotification(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showNotification]);

    const toggleNotifications = () => {
        setShowNotification(prev => {
            const willOpen = !prev;
            if (willOpen) {
                markAllAsRead();
            }
            return willOpen;
        });
    };

    return (
        <div className={`h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 shadow-xl transition-all duration-300 overflow-hidden p-5 flex flex-col justify-between border-r dark:border-neutral-800`}>
            <div className={`text-3xl font-bold text-purple-600 dark:text-purple-400 flex items-center text-center justify-center mt-10`}>
                <img src={iconChat} alt="" className="w-8 h-8" />
            </div>
            <div className="space-y-4 mb-[70px] my-5">
                <div className="">
                    <div className="relative flex items-center justify-center py-2">
                        <button
                            onClick={toggleNotifications}
                            data-notification-toggle="true"
                            className={`flex items-center justify-center px-1 py-2 space-x-2 rounded-lg transition-colors duration-300 
                            hover:bg-purple-100 hover:text-purple-500 dark:hover:bg-purple-900/50 dark:text-gray-200 dark:hover:text-purple-300`}
                        >
                            <IoMdNotifications className="text-2xl " />
                            {unreadCount > 0 && (
                                <span className="absolute top-3 left-2 bg-gradient-to-r from-pink-500 to-rose-500 animate-pulse text-white text-[10px] font-bold rounded-full w-5 h-4 text-center flex items-center justify-center p-0.5">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotification && (
                            <div
                                className="fixed top-52 left-10 inset-0 z-[9000]"
                                ref={notificationRef}
                            >
                                <div className="relative w-full h-full pointer-events-auto">
                                    <NotificationPanel
                                        isOpen={showNotification}
                                    />
                                </div>
                            </div>

                        )}
                    </div>
                    {user?.position === 'Department Head' && (
                        <div className="relative flex items-center justify-center my-6">
                            <button
                                onClick={handleNavigateToManageDepartment}
                                className={`flex items-center justify-center px-1 py-2 space-x-2 rounded-lg transition-colors duration-300 
                            hover:bg-purple-100 hover:text-purple-500 dark:hover:bg-purple-900/50 dark:text-gray-200 dark:hover:text-purple-300`}
                            >
                                <MdOutlineManageAccounts className="text-2xl" />
                            </button>
                        </div>
                    )}
                </div>               
                 <ul className={`space-y-14 text-base cursor-pointer px-0 py-4`}>
                    {navItems.map((item) => {
                        const isActive = currentComponent === item.component;
                        return (
                            <button
                                key={item.name}
                                onClick={() => handleNavItemClick(item)}
                                className={`flex items-center justify-center px-1 py-2 space-x-2 rounded-lg transition-colors duration-300 
                                ${isActive 
                                    ? 'bg-purple-500 text-white shadow-lg scale-110 dark:bg-purple-600' 
                                    : 'hover:bg-purple-100 hover:text-purple-500 dark:hover:bg-purple-900/50 dark:text-gray-200 dark:hover:text-purple-300'
                                }`}
                            >
                                <div className={'text-2xl'}>{item.icon}</div>
                            </button>
                        );
                    })}
                </ul>
            </div>
            <div className="flex items-center justify-center mb-7 relative">
                <img
                    src={user.avatar}
                    className="w-8 h-8 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform duration-300"
                    alt=""
                    onClick={handleShowMenu}
                />
            </div>
            {showMenu && (
                <div ref={menuRef} className="absolute w-48 left-16 bottom-1 bg-white dark:bg-neutral-800  shadow-lg rounded-lg p-2 z-[1000] dark:text-white">
                    <button
                        onClick={toggleTheme}
                        className='text-gray-700 w-full dark:text-gray-300 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200 flex items-center space-x-2'
                    >
                        {theme === 'dark' ? (
                            <>
                                <FaSun className='text-xl' />
                                <span>Light Mode</span>
                            </>

                        ) : (
                            <>
                                <CiBrightnessDown className=" text-xl" />
                                <span>Dark Mode</span>
                            </>
                        )}
                    </button>
                    <button
                        className="text-gray-700 w-full dark:text-gray-300 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200 flex items-center space-x-2"
                        onClick={handleShowPasswordForm}
                    >
                        <MdOutlineVpnKey className="text-xl" />
                        <span>Change Password</span>
                    </button>
                    {user.position === 'Administrator' && (
                        <button
                            className="text-gray-700 w-full dark:text-gray-300 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200 flex items-center space-x-2"
                            onClick={handleNavigateToAdminHome}
                        >
                            <IoIosSwitch className="text-xl" />
                            <span>Admin home</span>
                        </button>
                    )}
                    <button onClick={handleLogout} className="flex items-center space-x-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg w-full">
                        <MdVpnKey />
                        <span>Logout</span>
                    </button>
                </div>
            )}
            {showPasswordForm && (
                <ChangePassword onClose={() => setShowPasswordForm(false)} />
            )}
        </div>
    );
}

export default Sidebar;