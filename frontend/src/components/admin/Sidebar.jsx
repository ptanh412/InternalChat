import { CiChat2 } from "react-icons/ci";
import { FaLayerGroup } from "react-icons/fa";
import { FaBuildingUser } from "react-icons/fa6";
import { MdDashboard, MdManageAccounts, MdManageHistory, MdVpnKey } from "react-icons/md";
import { Link } from "react-router-dom";
import iconChat from "../../assets/messenger.png";


const Sidebar = ({ currentPath, collapsed }) => {
    const navItems = [
        { path: '/admin-home', name: 'Dashboard', icon: <MdDashboard /> },
        { path: '/accounts', name: 'Accounts', icon: <MdManageAccounts /> },
        { path: '/employees', name: 'Employees', icon: <FaBuildingUser /> },
        { path: '/roles', name: 'Roles', icon: <MdManageHistory /> },
        { path: '/departments', name: 'Departments', icon: <FaLayerGroup /> },
        { path: '/permissions', name: 'Permissions', icon: <MdVpnKey /> },
        { path: '/conversation', name: 'Conversations', icon: <CiChat2 /> }
    ];

    return (
        <div className={`h-screen bg-gradient-to-b from-indigo-600 to-purple-700 dark:from-slate-800 dark:to-slate-900 shadow-xl transition-all duration-300 ${collapsed ? 'px-2' : 'px-4'} overflow-hidden`}>
            {/* Logo & App Name */}
            <div className={`py-8 ${collapsed ? 'flex justify-center' : 'px-2'}`}>
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-lg">
                        <img src={iconChat} alt="" className="w-8 h-8" />
                    </div>
                    {!collapsed && (
                        <div className="text-white font-bold tracking-wide text-lg">
                            InternalChat
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="mt-6">
                {!collapsed && (
                    <div className="mb-4 px-4">
                        <span className="text-indigo-200 text-xs font-semibold tracking-wider uppercase">
                            Menu
                        </span>
                    </div>
                )}

                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <Link
                                to={item.path}
                                className={`flex items-center ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} rounded-lg transition-all duration-200
                                    ${currentPath === item.path
                                        ? 'bg-white/10 text-white shadow-md font-medium backdrop-blur-sm border-l-4 border-white'
                                        : 'text-indigo-100 hover:bg-white/5 hover:border-l-4 hover:border-indigo-300'
                                    }
                                `}
                            >
                                <div className={`${collapsed ? 'text-xl' : 'text-lg'} ${currentPath === item.path ? 'text-white' : 'text-indigo-200'}`}>
                                    {item.icon}
                                </div>

                                {!collapsed && (
                                    <span className="ml-3 font-medium">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Bottom Section for Profile or Settings */}
            {/* {!collapsed && (
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="bg-indigo-800/30 dark:bg-indigo-900/20 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-white/5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
                                A
                            </div>
                            <div className="text-white">
                                <p className="text-sm font-medium">Admin User</p>
                                <p className="text-xs text-indigo-200">System Admin</p>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};

export default Sidebar;