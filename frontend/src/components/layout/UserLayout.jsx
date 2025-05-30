import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ManageDepartment from '../user/ManageDepartment';
import Sidebar from '../user/Sidebar';
import Chat from '../user/Chat';
import { useChatContext } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
const UserLayout = () => {
    const { currentComponent, setCurrentComponent } = useChatContext();
    const { theme } = useTheme();
    const location = useLocation();
    const [activeComponent, setActiveComponent] = useState(<Chat currentComponent={currentComponent} setCurrentComponent={setCurrentComponent} />);

    // Determine which component to render based on the current path
    useEffect(() => {
        if (location.pathname === '/manage-department') {
            setActiveComponent(<ManageDepartment />);
        } else {
            setActiveComponent(<Chat currentComponent={currentComponent} setCurrentComponent={setCurrentComponent} />);
        }
    }, [location.pathname, currentComponent, setCurrentComponent]);

    return (
        <div className={`flex h-screen overflow-y-hidden ${theme === 'dark' ? 'dark' : ''} isolate`}>
            <div className={`transition-all duration-300 z-10`}>
                <Sidebar setCurrentComponent={setCurrentComponent} />
            </div>
            <div className="flex-1 z-0">
                <div className="h-screen bg-white dark:bg-neutral-900 transition-all duration-300">
                    {activeComponent}
                </div>
            </div>
            {/* DeactivationDialog đã được di chuyển lên cấp App */}
        </div>
    );
}

export default UserLayout;