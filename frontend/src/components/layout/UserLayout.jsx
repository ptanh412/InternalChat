import React, { useState, useEffect } from 'react';
import Sidebar from '../user/Sidebar';
import { useLocation } from 'react-router-dom';
import Chat from '../user/Chat';
import { useTheme } from '../../context/ThemeContext';

const UserLayout = () => {
    const [currentComponent, setCurrentComponent] = useState('ConversationList');
    const {theme} = useTheme();

    return (
        <div className={`flex h-screen overflow-y-hidden ${theme === 'dark' ? 'dark' : ''}`}>
            <div className={`transition-all duration-300 z-20`}>
                <Sidebar setCurrentComponent={setCurrentComponent} />
            </div>
            <div className="flex-1 z-10">
                <div className="h-screen">
                    <Chat currentComponent={currentComponent} />
                </div>
            </div>
        </div>
    );
}
export default UserLayout;