import React, { useEffect, useState } from 'react';
import axios from 'axios';
const Permissions = () => {

    const [permissionsMatrix, setPermissionsMatrix] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updateStatus, setUpdateStatus] = useState(null);

    useEffect(() => {
        fetchPermissionsMatrix();
    }, [])
    const fetchPermissionsMatrix = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/permission/matrix', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setPermissionsMatrix(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to fetch permissions matrix:' + error.message);
        } finally {
            setLoading(false);
        }
    }

    const formatRoleName = (roleName) => {
        const specificMappings = {
            'admin': 'Administrator',
            'user': 'User',
            'department_head': 'Header Department',
            'deputy_head': 'Deputy Department',
            'deputy_leader': 'Deputy Leader',
        }

        if (specificMappings[roleName]) {
            return specificMappings[roleName];
        }

        return roleName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    const formatPermissionName = (permissionName) => {
        const specificMappings = {
            'createGroup': 'Create Group',
            'createDepartment': 'Create Department',
            'manageDepartment': 'Manage Department',
            'manageUsers': 'Manage Users'
        }

        if (specificMappings[permissionName]) {
            return specificMappings[permissionName];
        }

        return permissionName
            .replace(/(A-Z)/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
    }

    const handlePermissionChange = async (roleId, permissionKey, newValue) => {
        try {
            console.log('Updating permission', roleId, permissionKey, newValue);
            setUpdateStatus({
                type: 'loading',
                message: 'Updating permission...'
            });

            const response = await axios.post(`http://localhost:5000/api/permission/update/${roleId}`, {
                permissionKey,
                value: newValue
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.data.success) {
                setPermissionsMatrix(prevMatrix => {
                    const updateRoles = prevMatrix.roles.map(role => {
                        if (role.id === roleId) {
                            return {
                                ...role,
                                values: {
                                    ...role.values,
                                    [permissionKey]: newValue
                                }
                            }
                        }
                        return role;
                    });

                    return {
                        ...prevMatrix,
                        roles: updateRoles
                    }
                });

                setUpdateStatus({
                    type: 'success',
                    message: `Successfully updated ${permissionKey} for ${response.data.roleName}`
                });
                setTimeout(() => {
                    setUpdateStatus(null);
                }, 3000);

            }
        } catch (error) {
            setUpdateStatus({
                type: 'error',
                message: 'Failed to update permission: ' + error.message
            });
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-indigo-50 dark:bg-slate-900">
                <div className="text-center p-8 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-indigo-100 dark:border-slate-700">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                    <div className="text-xl font-semibold text-indigo-800 dark:text-indigo-200">
                        Loading permissions matrix...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-rose-50 border border-rose-300 text-rose-700 dark:bg-slate-800 dark:border-rose-500 dark:text-rose-300 px-6 py-4 rounded-lg shadow-md" role="alert">
                    <div className="flex items-center">
                        <svg className="h-6 w-6 text-rose-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <strong className="font-bold text-rose-700 dark:text-rose-300">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">Permissions Matrix</h1>
                <button
                    onClick={fetchPermissionsMatrix}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>Refresh Permissions</span>
                </button>
            </div>

            {updateStatus && (
                <div className={`mb-6 px-6 py-4 rounded-lg shadow-md relative flex items-center ${updateStatus.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-slate-800 dark:border-emerald-500 dark:text-emerald-300'
                        : updateStatus.type === 'error'
                            ? 'bg-rose-50 border border-rose-300 text-rose-700 dark:bg-slate-800 dark:border-rose-500 dark:text-rose-300'
                            : 'bg-indigo-50 border border-indigo-300 text-indigo-700 dark:bg-slate-800 dark:border-indigo-500 dark:text-indigo-300'
                    }`}>
                    {updateStatus.type === 'success' && (
                        <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {updateStatus.type === 'error' && (
                        <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {updateStatus.type === 'info' && (
                        <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <div className="flex-1">{updateStatus.message}</div>
                    <button
                        className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => setUpdateStatus(null)}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {permissionsMatrix && (
                <div className="overflow-x-auto rounded-lg shadow-md border border-indigo-100 dark:border-slate-700">
                    <table className="min-w-full bg-white dark:bg-slate-800 rounded-lg">
                        <thead>
                            <tr className="bg-indigo-50 dark:bg-slate-700 text-left">
                                <th className="px-6 py-3 border-b border-indigo-100 dark:border-slate-600 text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider rounded-tl-lg">
                                    Role
                                </th>
                                {permissionsMatrix.permissions.map((permission, index) => (
                                    <th
                                        key={permission}
                                        className={`px-6 py-3 border-b border-indigo-100 dark:border-slate-600 text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider ${index === permissionsMatrix.permissions.length - 1 ? 'rounded-tr-lg' : ''
                                            }`}
                                    >
                                        {formatPermissionName(permission)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-100 dark:divide-slate-700">
                            {permissionsMatrix.roles.map((role, roleIndex) => (
                                <tr
                                    key={role.id}
                                    className={`hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors ${roleIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-indigo-50/30 dark:bg-slate-800/60'
                                        }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-800 dark:text-indigo-200">
                                        {formatRoleName(role.name)}
                                    </td>
                                    {permissionsMatrix.permissions.map(permission => (
                                        <td key={`${role.id}-${permission}`} className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-300">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-indigo-300 dark:border-slate-500 transition-colors"
                                                    checked={role.values[permission] || false}
                                                    onChange={(e) => handlePermissionChange(role.id, permission, !role.values[permission])}
                                                />
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    onClick={() => {/* Save changes function */ }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mr-3 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Save Changes
                </button>
                <button
                    onClick={() => {/* Reset function */ }}
                    className="bg-white hover:bg-gray-100 text-indigo-700 border border-indigo-300 py-2 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center dark:bg-slate-700 dark:text-indigo-200 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Reset
                </button>
            </div>
        </div>
    );
};

export default Permissions;