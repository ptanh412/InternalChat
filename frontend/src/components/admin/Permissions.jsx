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
            <div className='flex justify-center items-center h-screen'>
                <div className='text-2xl font-bold'>
                    Loading permissions matrix...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className='bg-red-500 border border-red-400 text-red-700 px-4 py-3 rounded relative' role='alert'>
                <strong className='font-bold'>Error: </strong>
                <span className='block sm:inline'>{error}</span>
            </div>
        )
    }
    return (
        <div>
            <h1 className='text-2xl font-bold mb-6 dark:text-white'>Permissions Matrix</h1>
            {updateStatus && (
                <div className={`mb-4 px-4 py-3 rounded relative ${updateStatus.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
                        updateStatus.type === 'error' ? 'bg-red-500 border border-red-400 text-red-700' :
                            'bg-blue-100 border border-blue-400 text-blue-700'
                    }`}>
                    {updateStatus.message}
                </div>
            )}

            {permissionsMatrix && (
                <div className='overflow-x-auto p-4 rounded'>
                    <table className='min-w-full bg-neutral-100 shadow-lg border-neutral-200 dark:border-neutral-700 rounded-lg'>
                        <thead className='rounded-lg'>
                            <tr className='bg-neutral-100 dark:bg-neutral-800'>
                                <th className='px-6 py-3 border-b border-neutral-200 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider dark:border-neutral-700'>
                                    Role
                                </th>
                                {permissionsMatrix.permissions.map(permission => (
                                    <th key={permission} className='px-6 py-3 border-b border-neutral-200 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider dark:border-neutral-700'>
                                        {permission}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {permissionsMatrix.roles.map(role => (
                                <tr key={role.id} className='bg-white dark:bg-neutral-800'>
                                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-white'>
                                        {role.name}
                                    </td>
                                    {permissionsMatrix.permissions.map(permission => (
                                        <td key={`${role.id}-${permission}`} className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500'>
                                            <label className='inline-flex items-center cursor-pointer'>
                                                <input
                                                    type='checkbox'
                                                    className='h-5 w-5 text-blue-600'
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
            <button
                onClick={fetchPermissionsMatrix}
                className='mt-6 ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300'
            >
                Refresh Permission
            </button>
        </div>
    )
}

export default Permissions;