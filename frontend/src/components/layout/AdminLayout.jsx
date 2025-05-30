import React, { useState } from 'react';
import Sidebar from '../admin/Sidebar';
import { MdNotifications, MdOutlineMenu } from 'react-icons/md';
import { CiBrightnessDown, CiLogout, CiSearch, CiSettings } from 'react-icons/ci';
import { FaSortDown, FaSun, FaUserEdit } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { IoIosSwitch } from "react-icons/io";

const AdminLayout = ({ children }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [collapsedSidebar, setCollapsedSidebar] = useState(false);
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useUser();
    const navigate = useNavigate();

    const handleShowMenu = () => {
        setShowMenu(!showMenu);
    };

    const handleToggleSidebar = () => {
        setCollapsedSidebar(!collapsedSidebar);
    }
    
    const handleLogout = () => {
        navigate('/login');
        logout();
    }
    
    const handleNavigateToAdminHome = () => {
        navigate('/chat');
    }

    return (
        <div className={`flex h-screen overflow-hidden bg-indigo-50 dark:bg-slate-900 ${theme === 'dark' ? 'dark' : ''}`}>
            {/* Sidebar */}
            <div className={`transition-all duration-300 ease-in-out ${collapsedSidebar ? 'w-16' : 'w-64'}`}>
                <Sidebar currentPath={location.pathname} collapsed={collapsedSidebar} />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-slate-800 w-full z-10 shadow-lg dark:shadow-purple-900/20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex justify-between items-center">
                            {/* Left section */}
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={handleToggleSidebar}
                                    className="text-indigo-600 dark:text-indigo-400 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors duration-200"
                                >
                                    <MdOutlineMenu className="text-2xl" />
                                </button>
                                
                                {/* Search Bar */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <CiSearch className="text-indigo-400 dark:text-indigo-300 text-xl" />
                                    </div>
                                    <input
                                        type="text"
                                        className="pl-10 pr-4 py-2 rounded-full border border-indigo-200 dark:border-slate-600 bg-indigo-50 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-64 text-sm text-slate-800 dark:text-white outline-none transition-all duration-200"
                                        placeholder="Search..."
                                    />
                                </div>
                            </div>
                            
                            {/* Right section */}
                            <div className="flex items-center space-x-5">
                                {/* Theme Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="text-amber-500 dark:text-amber-400 p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors duration-200"
                                >
                                    {theme === 'dark' ? (
                                        <FaSun className="text-xl" />
                                    ) : (
                                        <CiBrightnessDown className="text-2xl" />
                                    )}
                                </button>
                                
                                {/* Notifications */}
                                <button className="relative p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700 rounded-full transition-colors duration-200">
                                    <MdNotifications className="text-2xl" />
                                    <span className="absolute top-0 right-0 h-4 w-4 bg-rose-500 dark:bg-rose-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        3
                                    </span>
                                </button>
                                
                                {/* User Profile */}
                                <div className="relative">
                                    <button 
                                        onClick={handleShowMenu}
                                        className="flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 hover:from-indigo-100 hover:to-violet-100 dark:hover:from-slate-700 dark:hover:to-slate-600 py-2 px-3 rounded-lg transition-all duration-200 border border-indigo-100 dark:border-slate-600"
                                    >
                                        <img 
                                            src={user.avatar} 
                                            alt="User avatar" 
                                            className="h-8 w-8 rounded-full object-cover border-2 border-indigo-300 dark:border-indigo-500" 
                                        />
                                        <span className="font-medium text-indigo-800 dark:text-indigo-200">
                                            {user.name}
                                        </span>
                                        <FaSortDown className="text-indigo-500 dark:text-indigo-300" />
                                    </button>
                                    
                                    {/* User Menu Dropdown */}
                                    {showMenu && (
                                        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-slate-800 ring-1 ring-indigo-200 dark:ring-slate-700 divide-y divide-indigo-100 dark:divide-slate-700 z-50 border border-indigo-100 dark:border-slate-600">
                                            <div className="py-1">
                                                <a 
                                                    href="#" 
                                                    className="flex items-center px-4 py-2 text-sm text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                                >
                                                    <FaUserEdit className="mr-3 text-indigo-500 dark:text-indigo-400" />
                                                    Profile
                                                </a>
                                                <a 
                                                    href="#" 
                                                    className="flex items-center px-4 py-2 text-sm text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                                >
                                                    <CiSettings className="mr-3 text-indigo-500 dark:text-indigo-400" />
                                                    Settings
                                                </a>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={handleNavigateToAdminHome}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                                >
                                                    <IoIosSwitch className="mr-3 text-emerald-500 dark:text-emerald-400" />
                                                    Switch to Chat
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700"
                                                >
                                                    <CiLogout className="mr-3" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-indigo-50 dark:bg-slate-900 p-4 scrollbar-none">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-gradient-to-b bg-white dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-md p-6 border border-indigo-100 dark:border-slate-700">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;