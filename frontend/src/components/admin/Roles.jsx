import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSave, MdCancel } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext'

const Roles = () => {
    const {showAlert} = useAlert();
    const [roles, setRoles] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newRole, setNewRole] = useState({
        name: "",
        permissionData: {
            createGroup: false,
            createDepartment: false,
            manageDepartment: false,
            manageUsers: false
        }
    });

    useEffect(() => {
        fetchRoles();
    }, []);
    const fetchRoles = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/role', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            console.log(response.data.data);
            setRoles(response.data.data);
        } catch (error) {
            console.error(error);
        }
    }

    const handleAddNew = () => {
        setIsAdding(true);
        setNewRole({
            name: "",
            permissionData: {
                createGroup: false,
                createDepartment: false,
                manageDepartment: false,
                manageUsers: false
            }
        });
    }
    const handleCancelAdd = () => {
        setIsAdding(false);
    }

    const handleSaveNew = async () => {
        try {
            const response = await axios.post("http://localhost:5000/api/role", newRole, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                showAlert("Role added successfully", "success");
                await fetchRoles();
                setIsAdding(false);
            }
        } catch (error) {
            showAlert("Failed to add role", "error");
            console.error(error);
        }
    }

    const handleNewRoleChange = (e, field) => {
        setNewRole({
            ...newRole,
            [field]: e.target.value
        })
    }

    const handlePermissionChange = (permission) => {
        setNewRole({
            ...newRole,
            permissionData: {
                ...newRole.permissionData,
                [permission]: !newRole.permissionData[permission]
            }
        })
    }

    const formatPermissions = (permissions) =>{
        if (!permissions) return 'N/A';

        const permissionKeys = [
            'createGroup',
            'createDepartment',
            'manageDepartment',
            'manageUsers'
        ];

        const activePermissions = permissionKeys
        .filter (key => permissions[key] === true)
        .map(key =>{
            return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        })

        return activePermissions.length > 0 ? activePermissions.join(', ') : 'Not permission in system';
    }


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);

        if (isNaN(date.getTime())){
            return 'N/A';
        };

        return date.toLocaleDateString();
    }
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">Roles Manager</h1>
                <button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md hover:shadow-lg"
                    onClick={handleAddNew}
                >
                    <MdAdd className="text-xl" />
                    <span>Add New Role</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-indigo-100 dark:border-slate-700">
                <div className="p-4 border-b border-indigo-100 dark:border-slate-700 bg-indigo-50 dark:bg-slate-800">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                                placeholder="Search roles..."
                            />
                        </div>
                        <select className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white">
                            <option value="">All Roles</option>
                            {roles.map(role => (
                                <option key={role._id} value={role._id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-indigo-100 dark:divide-slate-700">
                    <thead className="bg-indigo-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Role Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Permission</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Updated At</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-indigo-100 dark:divide-slate-600 dark:bg-slate-800">
                        {roles.map((role, index) => (
                            <tr key={role._id || `role-${index}`} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{index + 1}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-indigo-700 dark:text-indigo-100">{role.name || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-indigo-600 dark:text-indigo-300">
                                        {formatPermissions(role.permissions)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-indigo-600 dark:text-indigo-300">{formatDate(role.updatedAt)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-3">
                                        <Link 
                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 hover:bg-indigo-100 dark:hover:bg-slate-600 rounded-full transition-colors" 
                                            to={'/permissions'}
                                        >
                                            <MdEdit className="text-xl" />
                                        </Link>
                                        <button className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 p-1 hover:bg-rose-100 dark:hover:bg-slate-600 rounded-full transition-colors">
                                            <MdDelete className="text-xl" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {isAdding && (
                            <tr className="hover:bg-indigo-50 dark:hover:bg-slate-700 bg-indigo-50/40 dark:bg-slate-700/40 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">New</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        value={newRole.name}
                                        onChange={(e) => handleNewRoleChange(e, 'name')}
                                        className="w-full px-3 py-2 border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-indigo-800 dark:text-white outline-none"
                                        placeholder="Role Name"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="createGroup"
                                                checked={newRole.permissionData.createGroup}
                                                onChange={() => handlePermissionChange('createGroup')}
                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 rounded"
                                            />
                                            <label htmlFor="createGroup" className="text-sm text-indigo-700 dark:text-indigo-200">Create Group</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="createDepartment"
                                                checked={newRole.permissionData.createDepartment}
                                                onChange={() => handlePermissionChange('createDepartment')}
                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 rounded"
                                            />
                                            <label htmlFor="createDepartment" className="text-sm text-indigo-700 dark:text-indigo-200">Create Department</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="manageDepartment"
                                                checked={newRole.permissionData.manageDepartment}
                                                onChange={() => handlePermissionChange('manageDepartment')}
                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 rounded"
                                            />
                                            <label htmlFor="manageDepartment" className="text-sm text-indigo-700 dark:text-indigo-200">Manage Department</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="manageUsers"
                                                checked={newRole.permissionData.manageUsers}
                                                onChange={() => handlePermissionChange('manageUsers')}
                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 rounded"
                                            />
                                            <label htmlFor="manageUsers" className="text-sm text-indigo-700 dark:text-indigo-200">Manage Users</label>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Just now</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleSaveNew}
                                            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 hover:bg-emerald-100 dark:hover:bg-slate-600 rounded-full transition-colors"
                                        >
                                            <MdSave className="text-xl" />
                                        </button>
                                        <button
                                            onClick={handleCancelAdd}
                                            className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 p-1 hover:bg-rose-100 dark:hover:bg-slate-600 rounded-full transition-colors"
                                        >
                                            <MdCancel className="text-xl" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="px-6 py-4 flex items-center justify-between border-t border-indigo-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-slate-800">
                    <div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-200">
                            Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">5</span> results
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button className="px-4 py-2 border border-indigo-300 dark:border-slate-600 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors duration-200 shadow-sm">
                            Previous
                        </button>
                        <button className="px-4 py-2 border border-indigo-300 dark:border-slate-600 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors duration-200 shadow-sm">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Roles;