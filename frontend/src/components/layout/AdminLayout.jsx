import React, { useState, useEffect } from 'react';
import Sidebar from '../admin/Sidebar';
import { MdNotifications, MdOutlineMenu } from 'react-icons/md';
import { CiBrightnessDown, CiLogout, CiSearch, CiSettings } from 'react-icons/ci';
import { FaSortDown, FaSun, FaUserEdit } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const AdminLayout = ({ children }) => {
    const [showMenu, setShowmenu] = useState(false);
    const [collapsedSidebar, setCollapsedSidebar] = useState(false);
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { user } = useUser();

    const handleShowMenu = () => {
        setShowmenu(!showMenu);
    };

    const handleToggleSidebar = () => {
        setCollapsedSidebar(!collapsedSidebar);
    }

    return (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
            <div className={`transition-all duration-300 ${collapsedSidebar ? 'w-16' : 'w-64'}`}>
                <Sidebar currentPath={location.pathname} collapsed={collapsedSidebar} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-white dark:bg-gray-800 w-full z-10 px-14 py-3 shadow-md">
                    <div className="flex justify-between items-center max-w-7xl mx-auto">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold dark:text-white">
                                <MdOutlineMenu
                                    className="cursor-pointer dark:hover:text-gray-300 hover:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 duration-150 transition-colors rounded-full hover:rounded-full p-1 text-4xl"
                                    onClick={handleToggleSidebar}
                                />
                            </h1>
                            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-full relative">
                                <div className="absolute left-3 flex items-center">
                                    <CiSearch className="text-gray-400 text-xl" />
                                </div>
                                <input
                                    type="text"
                                    className="pl-10 pr-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 outline-none w-64 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-gray-800 dark:text-white"
                                    placeholder="Search..."
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 ">
                            <button
                                onClick={toggleTheme}
                                className='text-gray-700 dark:text-gray-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200'
                            >
                                {theme === 'dark' ? (
                                    <FaSun className='text-xl' />
                                ) : (
                                    <CiBrightnessDown className=" text-xl" />
                                )}
                            </button>
                            <MdNotifications className="text-gray-700 dark:text-gray-200 dark:border-gray-600 border rounded-full p-2 text-4xl" />
                            <div className="flex items-center space-x-2 relative">
                                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full mr-2" />
                                <p className='dark:text-white'>{user.name}</p>
                                <button className="dark:text-white" onClick={handleShowMenu}>
                                    <FaSortDown />
                                </button>
                                {showMenu && (
                                    <div className="absolute top-12 right-0 w-48 bg-white dark:bg-gray-800 dark:border-gray-700 border border-gray-300 rounded-lg shadow-lg z-50">
                                        <ul>
                                            <li className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white px-4 py-2 cursor-pointer flex items-center space-x-2">
                                                <FaUserEdit />
                                                <p>Profile</p>
                                            </li>
                                            <li className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white px-4 py-2 cursor-pointer flex items-center space-x-2">
                                                <CiSettings />
                                                <p>Settings</p>
                                            </li>
                                            <li className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white px-4 py-2 cursor-pointer flex items-center space-x-2">
                                                <CiLogout />
                                                <p>Logout</p>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto dark:bg-gray-900">
                    <div className="max-w-7xl mx-auto px-5 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default AdminLayout;