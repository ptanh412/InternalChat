import { CiChat2 } from "react-icons/ci";
import { FaLayerGroup } from "react-icons/fa";
import { MdDashboard, MdManageAccounts, MdManageHistory, MdVpnKey } from "react-icons/md";
import { Link } from "react-router-dom";

const Sidebar = ({ currentPath, collapsed }) => {

    const navItems = [
        { path: '/admin-home', name: 'Dashboard', icon: <MdDashboard /> },
        { path: '/accounts', name: 'Accounts', icon: <MdManageAccounts /> },
        { path: '/roles', name: 'Roles', icon: <MdManageHistory /> },
        { path: '/departments', name: 'Departments', icon: <FaLayerGroup /> },
        { path: '/permissions', name: 'Permissions', icon: <MdVpnKey /> },
    ]
    return (
        <div className={`h-screen space-y-10 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ${collapsed ? 'px-2' : 'px-5'} overflow-hidden`}>
            <div className={`text-2xl font-bold dark:text-white flex items-center space-x-2 mt-10 ${collapsed ? 'justify-center' : ''}`}>
                <CiChat2 />
                {!collapsed && <p>InternalChat</p>}
            </div>
            <div className="space-y-4">
                {!collapsed && <h1 className="text-gray-400 font-semibold text-xs">MENU</h1>}
                <ul className={`space-y-14 text-base cursor-pointer ${collapsed ? 'px-0' : 'px-2'}`}>
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path}
                            className={`flex items-center ${collapsed ? 'justify-center px-1 py-2' :'px-2 py-2'} space-x-2 rounded-lg transition-colors duration-300 
                            ${currentPath === item.path ? 
                                'bg-blue-100 text-blue-500 dark:bg-blue-900 dark:text-blue-300' 
                                : 'hover:bg-blue-100 hover:text-blue-500 dark:hover:bg-blue-900/50 dark:text-gray-200 dark:hover:text-blue-300'
                                }`}>
                            <div className={collapsed ? 'text-xl' : ''}>{item.icon}</div>
                            {!collapsed && <h2>{item.name}</h2>}
                        </Link>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Sidebar;