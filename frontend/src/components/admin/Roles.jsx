import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSave, MdCancel } from 'react-icons/md';
import { Link } from 'react-router-dom';

const Roles = () => {
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
                await fetchRoles();
                // setRoles([...roles, response.data.data]);
                setIsAdding(false);
            }
        } catch (error) {
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
                <h1 className="text-2xl font-bold dark:text-white">Roles Manger </h1>
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-300"
                    onClick={handleAddNew}
                >
                    <MdAdd />
                    <span>Add New Role</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden dark:bg-neutral-800">
                <div className="p-4 border-b dark:border-neutral-700">
                    <div className="flex items-center space-x-4">
                        <input
                            type="text"
                            className="pl-4 pr-4 py-2 rounded-lg border dark:text-white dark:bg-neutral-700 dark:border-neutral-600 border-neutral-300 outline-none w-64 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            placeholder="Search accounts..."
                        />
                        <select className="pl-4 pr-4 py-2 rounded-lg border dark:bg-neutral-700 dark:border-neutral-600 dark:text-white border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <option value="">All Roles</option>
                            {roles.map(role => (
                                <option key={role._id} value={role._id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                    <thead className="bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-500">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Role Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Permission</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Update At</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200 dark:divide-neutral-500 dark:bg-neutral-800">
                        {roles.map((role, index) => (
                            <tr key={role._id || `role-${index}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 dark:text-white">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{index + 1}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-neutral-500 dark:text-white">{role.name || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-neutral-500 dark:text-white">
                                        {formatPermissions(role.permissions)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-neutral-500 dark:text-white">{formatDate(role.updatedAt)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <Link className="text-blue-600 hover:text-blue-900" to={'/permissions'}>
                                            <MdEdit className="text-xl" />
                                        </Link>
                                        <button className="text-red-600 hover:text-red-900">
                                            <MdDelete className="text-xl" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {isAdding && (
                            <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white">New</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        value={newRole.name}
                                        onChange={(e) => handleNewRoleChange(e, 'name')}
                                        className='w-full px-2 py-1 border dark:bg-neutral-800 dark:border-neutral-600 dark:text-white rounded'
                                        placeholder='Role Name'
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className='space-y-2'>
                                        <div className='flex items-center'>
                                            <input
                                                type="checkbox"
                                                id='createGroup'
                                                checked={newRole.permissionData.createGroup}
                                                onChange={() => handlePermissionChange('createGroup')}
                                                className='mr-2'
                                            />
                                            <label htmlFor='createGroup' className='text-sm text-neutral-700 dark:text-white'>Create Group</label>
                                        </div>
                                        <div className='flex items-center'>
                                            <input
                                                type="checkbox"
                                                id='createDepartment'
                                                checked={newRole.permissionData.createDepartment}
                                                onChange={() => handlePermissionChange('createDepartment')}
                                                className='mr-2'
                                            />
                                            <label htmlFor='createDepartment' className='text-sm text-neutral-700 dark:text-white'>Create Department</label>
                                        </div>
                                        <div className='flex items-center'>
                                            <input
                                                type="checkbox"
                                                id='manageDepartment'
                                                checked={newRole.permissionData.manageDepartment}
                                                onChange={() => handlePermissionChange('manageDepartment')}
                                                className='mr-2'
                                            />
                                            <label htmlFor='manageDepartment' className='text-sm text-neutral-700 dark:text-white'>Manage Department</label>
                                        </div>
                                        <div className='flex items-center'>
                                            <input
                                                type="checkbox"
                                                id='manageUsers'
                                                checked={newRole.permissionData.manageUsers}
                                                onChange={() => handlePermissionChange('manageUsers')}
                                                className='mr-2'
                                            />
                                            <label htmlFor='manageUsers' className='text-sm text-neutral-700 dark:text-white'>Mange User</label>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white">New</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleSaveNew}
                                            className='text-green-600 hover:text-green-900'
                                        >
                                            <MdSave className='text-xl' />
                                        </button>
                                        <button
                                            onClick={handleCancelAdd}
                                            className='text-red-600 hover:text-red-900'
                                        >
                                            <MdCancel className='text-xl' />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="px-6 py-4 flex items-center justify-between border-t dark:border-neutral-700">
                    <div>
                        <p className="text-sm text-neutral-700 dark:text-white">
                            Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">5</span> results
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50">
                            Previous
                        </button>
                        <button className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Roles;