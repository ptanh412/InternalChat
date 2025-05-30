import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdLock, MdLockOpen } from 'react-icons/md';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext'
const Accounts = () => {
    const [accounts, setAccounts] = useState([]);
    const { showAlert } = useAlert();

    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const { getUserStatus, onlineUsers } = useUser();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [usersPerPage, setUsersPerPage] = useState(10);

    const positions = ['Director', 'Deputy Director', 'Secretary', 'Department Head', 'Deputy Department', 'Project Leader', 'Administrator', 'Employee'];


    useEffect(() => {
        const fetchDataAccount = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/auth/get-user", {
                    params: {
                        page: currentPage,
                        limit: usersPerPage,
                        search: searchTerm,
                        position: positionFilter,
                        department: departmentFilter,
                        status: statusFilter !== 'all' ? statusFilter : ''
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.data.success && response.data.data) {
                    setAccounts(response.data.data.users);
                    setTotalPages(response.data.data.pagination.pages);
                    setTotalUsers(response.data.data.pagination.totalUsers);
                }
            } catch (error) {
                console.log("error");
            }
        };

        const fetchDepartments = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/department", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.data.success && response.data.data) {
                    setDepartments(response.data.data);
                }
            } catch (error) {
                console.log("error");
            }
        }
        fetchDataAccount();
        fetchDepartments();

        const refreshStatus = setInterval(fetchDataAccount, 10000);
        return () => clearInterval(refreshStatus);
    }, [currentPage, usersPerPage, searchTerm, positionFilter, departmentFilter, statusFilter]);
    // console.log(totalUsers, totalPages);


    useEffect(() => {
        applyFilters();
    }, [searchTerm, positionFilter, departmentFilter, statusFilter, accounts]);

    const applyFilters = () => {
        let filtered = [...accounts];

        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            filtered = filtered.filter(account =>
                searchRegex.test(account.name) || searchRegex.test(account.employeeId)
            )
        }

        if (positionFilter) {
            filtered = filtered.filter(account => {
                // console.log(account.name, account.position);
                return account.position === positionFilter;
            }
            );

        }

        if (departmentFilter) {
            filtered = filtered.filter(account => account.department._id === departmentFilter || account.department === departmentFilter);
        }

        if (statusFilter !== 'all') {
            const isOnline = statusFilter === 'online';
            filtered = filtered.filter(account => {
                const status = getUserStatus(account._id);
                // console.log(account.name, getUserStatus(account._id));
                return isOnline ? status === 'online' : status !== 'online';
            })
        }

        setFilteredAccounts(filtered);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handlePositionFilterChange = (e) => {
        setPositionFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleDepartmentFilterChange = (e) => {
        setDepartmentFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    }
    useEffect(() => { }, [onlineUsers]);

    const handleAddClick = () => {
        navigate('/accounts/add-account');
    }

    const handleEditClick = (accountId) => {
        navigate(`/accounts/edit-account/${accountId}`);
    }

    const handleToggleActive = async (accountId, currentActive) => {
        try {
            const response = await axios.put(`http://localhost:5000/api/auth/toggle-active/${accountId}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.data.success) {
                setAccounts(accounts.map(account => {
                    if (account._id === accountId) {
                        return { ...account, active: !currentActive };
                    }
                    return account;
                }));
                showAlert(
                    `Account ${currentActive ? 'deactivated' : 'activated'} successfully`,'success'
                );
            } else {
                showAlert(response.data.message, "error");
            }
        } catch (error) {
            console.log("error");
            showAlert("Error updating account status", "error");
        }
    }

    const handleDeleteClick = async (accountId) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            try {
                const response = await axios.delete(`http://localhost:5000/api/auth/delete-user/${accountId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.data.success) {
                    setAccounts(accounts.filter(account => account._id !== accountId));
                }
                showAlert(response.data.message, "success");
            } catch (error) {
                console.log("error");
                showAlert("Error deleting account", "error");
            }
        }
    }

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const displayedAccounts = searchTerm || positionFilter || departmentFilter || statusFilter !== 'all'
        ? filteredAccounts
        : accounts;
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, totalUsers);

    const sortedAccounts = [...displayedAccounts].sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return (
        <div className='p-6'>
            <div className='flex justify-between items-center mb-10'>
                <h1 className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">User accounts</h1>
                <button
                    className='flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg'
                    onClick={handleAddClick}
                >
                    <MdAdd />
                    <span>Add Account</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-indigo-100 dark:border-slate-700">
                <div className="p-4 border-b border-indigo-100 dark:border-slate-700 bg-indigo-50 dark:bg-slate-800">
                    <div className='flex items-center space-x-4'>
                        <input
                            type='text'
                            placeholder='Search accounts'
                            className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                        >
                            <option value='all'>All Status</option>
                            <option value='online'>Active</option>
                            <option value='offline'>Inactive</option>
                        </select>
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                            value={departmentFilter}
                            onChange={handleDepartmentFilterChange}
                        >
                            <option value="">All Departments</option>
                            {departments.map(department => (
                                <option key={department._id} value={department._id}>{department.name}</option>
                            ))}
                        </select>
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                            value={positionFilter}
                            onChange={handlePositionFilterChange}
                        >
                            <option value="">All Positions</option>
                            {positions.map(position => (
                                <option key={position} value={position}>{position}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-indigo-100 dark:divide-slate-700">
                    <thead className="bg-indigo-50 dark:bg-slate-700">
                        <tr>
                            <th scope='col' className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                ID
                            </th>
                            <th scope='col' className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                Email
                            </th>
                            <th scope='col' className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope='col' className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                Active
                            </th>
                            <th scope='col' className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-indigo-100 dark:divide-slate-600 dark:bg-slate-800" >
                        {sortedAccounts.map((account) => {
                            const status = getUserStatus(account._id);
                            const isOnline = status === 'online';
                            const isActive = account.active !== undefined ? account.active : true;
                            console.log(account.active);
                            return (
                                <tr key={account._id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors duration-150">
                                    <td className='px-6 py-4 whitespace-nowrap font-bold'>
                                        <div className='text-sm  text-neutral-500 dark:text-white'>
                                            {account.employeeId}
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-sm  text-neutral-500 dark:text-white'>
                                            {account.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {isActive ? 'Active' : 'Deactivated'}
                                        </span>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='flex space-x-2'>
                                            <button
                                                className='text-blue-600 hover:text-blue-900'
                                                onClick={() => handleEditClick(account._id)}
                                            >
                                                <MdEdit className='text-xl' />
                                            </button>
                                            <button
                                                className='text-red-600 hover:text-red-900'
                                                onClick={() => handleDeleteClick(account._id)}
                                            >
                                                <MdDelete className='text-xl' />
                                            </button>
                                             <button
                                                className={`${isActive ? 'text-amber-600 hover:text-amber-900' : 'text-green-600 hover:text-green-900'}`}
                                                onClick={() => handleToggleActive(account._id, isActive)}
                                                title={isActive ? 'Deactivate account' : 'Activate account'}
                                            >
                                                {isActive ? <MdLock className='text-xl' /> : <MdLockOpen className='text-xl' />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <div className='px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 border-t dark:border-neutral-700'>
                    <div className='dark:text-white'>
                        <p className="px-4 py-2 border border-indigo-300 dark:border-slate-600 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors duration-200 shadow-sm">
                            Showing <span className='font-medium'>{startIndex + 1}</span> to <span className='font-medium'>{endIndex}</span> of <span className='font-medium'>{totalUsers}</span> results
                        </p>
                    </div>
                    <div className='flex items-center justify-center space-x-2'>
                        <button
                            className={`px-3 py-1 border border-neutral-300 rounded-md text-sm font-medium ${currentPage === 1
                                ? 'text-neutral-400 cursor-not-allowed bg-neutral-100'
                                : 'text-neutral-700 bg-white hover:bg-neutral-50'
                                } dark:bg-neutral-700 dark:text-white dark:hover-neutral-600 dark:hover:bg-neutral-600 ${currentPage === 1 ? 'dark:bg-neutral-600' : ''
                                }`}
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            First
                        </button>
                        <button
                            className={`px-3 py-1 border border-neutral-300 rounded-md text-sm font-medium ${currentPage === 1
                                ? 'text-neutral-400 cursor-not-allowed bg-neutral-100'
                                : 'text-neutral-700 bg-white hover:bg-neutral-50'
                                } dark:bg-neutral-700 dark:text-white dark:hover-neutral-600 dark:hover:bg-neutral-600 ${currentPage === 1 ? 'dark:bg-neutral-600' : ''
                                }`}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => {
                            return page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)
                        }).map((page, index, array) => {
                            const needsLeftEllipsis = index > 0 && array[index - 1] !== page - 1;
                            const needsRightEllipsis = index < array.length - 1 && array[index + 1] !== page + 1;

                            return (
                                <React.Fragment key={`page-${page}`}>
                                    {needsLeftEllipsis &&
                                        <span className='px-3 py-1 text-neutral-500 dark:text-neutral-400'>...</span>
                                    }
                                    <button
                                        className={`px-3 py-1 border border-neutral-300 rounded-md text-sm font-medium 
                                            ${currentPage === page
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'text-neutral-700 bg-white hover:bg-neutral-50'
                                            } dark:border-neutral-600 
                                            ${currentPage === page ?
                                                'dark:bg-blue-600 dark:text-white dark:border-blue-600' :
                                                'dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                    {needsRightEllipsis &&
                                        <span className='px-3 py-1 text-neutral-500 dark:text-neutral-400'>...</span>
                                    }
                                </React.Fragment>
                            );
                        })
                        }
                        <button
                            className={`px-3 py-1 border border-neutral-300 rounded-md text-sm font-medium ${currentPage === totalPages
                                ? 'text-neutral-400 cursor-not-allowed bg-neutral-100'
                                : 'text-neutral-700 bg-white hover:bg-neutral-50'
                                } dark:bg-neutral-700 dark:text-white dark:hover-neutral-600 dark:hover:bg-neutral-600 ${currentPage === totalPages ? 'dark:bg-neutral-800 dark:text-neutral-500' : ''
                                }`}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>

                        <button
                            className={`px-3 py-1 border border-neutral-300 rounded-md text-sm font-medium ${currentPage === totalPages
                                ? 'text-neutral-400 cursor-not-allowed bg-neutral-100'
                                : 'text-neutral-700 bg-white hover:bg-neutral-50'
                                } dark:bg-neutral-700 dark:text-white dark:hover-neutral-600 dark:hover:bg-neutral-600 ${currentPage === totalPages ? 'dark:bg-neutral-800 data:text-neutral-500' : ''
                                }`}
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            Last
                        </button>
                    </div>

                    <div className='flex items-center space-x-2 ml-5'>
                        <label className="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-50">Rows per page:</label>
                        <select
                            className="px-4 py-2 border border-indigo-300 dark:border-slate-600 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors duration-200 shadow-sm"

                            value={usersPerPage}
                            onChange={(e) => {
                                setUsersPerPage(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {[5, 10, 15, 20].map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Accounts;