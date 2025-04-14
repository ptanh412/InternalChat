import React, { useState, useEffect } from 'react';
import Sidebar from '../user/Sidebar';
import Chat from '../user/Chat';
import { useTheme } from '../../context/ThemeContext';
import { useChatContext } from '../../context/ChatContext';

const UserLayout = () => {
    const {currentComponent, setCurrentComponent} = useChatContext();
    const { theme } = useTheme();

    return (
        <div className={`flex h-screen overflow-y-hidden ${theme === 'dark' ? 'dark' : ''}`}>
            <div className={`transition-all duration-300 z-10`}>
                <Sidebar setCurrentComponent={setCurrentComponent} />
            </div>
            <div className="flex-1 z-">
                <div className="h-screen">
                    <Chat
                        currentComponent={currentComponent}
                        setCurrentComponent={setCurrentComponent}
                    />
                </div>
            </div>
        </div>
    );
}
export default UserLayout;