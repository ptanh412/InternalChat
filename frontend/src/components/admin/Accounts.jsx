import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
const Accounts = () => {
    const [accounts, setAccounts] = useState([]);
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
    const [usersPerPage, setUsersPerPage] = useState(5);

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
            } catch (error) {
                console.log("error");
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
    
    return (
        <div className='p-6'>
            <div className='flex justify-between items-center mb-10'>
                <h1 className='font-bold text-2xl dark:text-white'>User accounts</h1>
                <button
                    className='flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg'
                    onClick={handleAddClick}
                >
                    <MdAdd />
                    <span>Add Account</span>
                </button>
            </div>

            <div className='bg-white rounded-lg shadow-md overflow-hidden dark:bg-gray-800'>
                <div className='p-4 border-b dark:border-gray-700'>
                    <div className='flex items-center space-x-4'>
                        <input
                            type='text'
                            placeholder='Search accounts'
                            className='pl-4 pr-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-gray-800 dark:text-white dark:border-gray-700'
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                        >
                            <option value='all'>All Status</option>
                            <option value='online'>Active</option>
                            <option value='offline'>Inactive</option>
                        </select>
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                            value={departmentFilter}
                            onChange={handleDepartmentFilterChange}
                        >
                            <option value="">All Departments</option>
                            {departments.map(department => (
                                <option key={department._id} value={department._id}>{department.name}</option>
                            ))}
                        </select>
                        <select
                            className="pl-4 pr-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-gray-800 dark:text-white dark:border-gray-700"
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
                <table className='min-w-full divide-y divide-gray-200 dark:bg-gray-800  dark:border-gray-700 dark:divide-gray-700'>
                    <thead className='bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700'>
                        <tr>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider '>
                                ID
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider '>
                                Name
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Email
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Role
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Department
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Status
                            </th>
                            <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:divide-gray-700 ' >
                        {displayedAccounts.map((account) => {
                            const status = getUserStatus(account._id);
                            const isOnline = status === 'online';
                            return (
                                <tr key={account._id} className='hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'>
                                    <td className='px-6 py-4 whitespace-nowrap font-bold'>
                                        <div className='text-sm  text-gray-500 dark:text-white'>
                                            {account.employeeId}
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap dark:text-white'>
                                        <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                            {account.name}
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-sm  text-gray-500 dark:text-white'>
                                            {account.email}
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-sm  text-gray-500 dark:text-white'>
                                            {account.position}
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-sm  text-gray-500 dark:text-white'>
                                            {account.department.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {isOnline ? 'Online' : 'Offline'}
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
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <div className='px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 border-t dark:border-gray-700'>
                    <div className='dark:text-white'>
                        <p >
                            Showing <span className='font-medium'>{startIndex + 1}</span> to <span className='font-medium'>{endIndex}</span> of <span className='font-medium'>{totalUsers}</span> results
                        </p>
                    </div>
                    <div className='flex items-center justify-center space-x-2'>
                        <button
                            className={`px-3 py-1 border border-gray-300 rounded-md text-sm font-medium ${currentPage === 1
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-700 bg-white hover:bg-gray-50'
                                } dark:bg-gray-700 dark:text-white dark:hover-gray-600 dark:hover:bg-gray-600 ${currentPage === 1 ? 'dark:bg-gray-600' : ''
                                }`}
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            First
                        </button>
                        <button
                            className={`px-3 py-1 border border-gray-300 rounded-md text-sm font-medium ${currentPage === 1
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-700 bg-white hover:bg-gray-50'
                                } dark:bg-gray-700 dark:text-white dark:hover-gray-600 dark:hover:bg-gray-600 ${currentPage === 1 ? 'dark:bg-gray-600' : ''
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
                                        <span className='px-3 py-1 text-gray-500 dark:text-gray-400'>...</span>
                                    }
                                    <button
                                        className={`px-3 py-1 border border-gray-300 rounded-md text-sm font-medium 
                                            ${currentPage === page
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'text-gray-700 bg-white hover:bg-gray-50'
                                            } dark:border-gray-600 
                                            ${currentPage === page ?
                                                'dark:bg-blue-600 dark:text-white dark:border-blue-600' :
                                                'dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                    {needsRightEllipsis &&
                                        <span className='px-3 py-1 text-gray-500 dark:text-gray-400'>...</span>
                                    }
                                </React.Fragment>
                            );
                        })
                        }
                        <button
                            className={`px-3 py-1 border border-gray-300 rounded-md text-sm font-medium ${currentPage === totalPages
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-700 bg-white hover:bg-gray-50'
                                } dark:bg-gray-700 dark:text-white dark:hover-gray-600 dark:hover:bg-gray-600 ${currentPage === totalPages ? 'dark:bg-gray-800 dark:text-gray-500' : ''
                                }`}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>

                        <button
                            className={`px-3 py-1 border border-gray-300 rounded-md text-sm font-medium ${currentPage === totalPages
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-700 bg-white hover:bg-gray-50'
                                } dark:bg-gray-700 dark:text-white dark:hover-gray-600 dark:hover:bg-gray-600 ${currentPage === totalPages ? 'dark:bg-gray-800 data:text-gray-500' : ''
                                }`}
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            Last
                        </button>
                    </div>

                    <div className='flex items-center space-x-2 ml-5'>
                        <label className='text-sm dark:text-white'>Rows per page:</label>
                        <select
                            className='px-2 py-1 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700'
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