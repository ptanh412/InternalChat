import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSave, MdCancel } from 'react-icons/md';
import axios from 'axios';
import { useAlert } from '../../context/AlertContext'

const Department = () => {
    const { showAlert } = useAlert();
    const [departments, setDepartments] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newDepartment, setNewDepartment] = useState({
        name: "",
        description: "",
        header: ""
    });

    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        header: ""
    });

    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);
    const fetchData = async () => {
        try {
            const depResponse = await axios.get("http://localhost:5000/api/department", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setDepartments(depResponse.data.data);

            const userResponse = await axios.get("http://localhost:5000/api/auth/get-user", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            console.log(userResponse.data.data);
            setUsers(userResponse.data.data.users);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (department) => {
        setEditingId(department._id);
        setEditForm({
            name: department.name,
            description: department.description,
            header: department.header
        });
    }

    const handleCancelEdit = () => {
        setEditingId(null);
    }

    const handleSaveEdit = async (departmentId) => {
        try {
            const response = await axios.put(`http://localhost:5000/api/department/update/${departmentId}`, editForm, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                const updatedDepts = departments.map(dept =>
                    dept._id === departmentId ? {
                        ...dept,
                        name: editForm.name,
                        description: editForm.description,
                        header: editForm.header ? {
                            _id: editForm.header,
                            name: users.find(user => user._id === editForm.header).name
                        } : null
                    } : dept
                );
                showAlert("Department updated successfully", "success");
                await fetchData();
                setDepartments(updatedDepts);
                setEditingId(null);
            }
        } catch (error) {
            showAlert("Error updating department", "error");
            console.error(error);
        }
    }

    const handleAddNew = () => {
        setIsAdding(true);
        setNewDepartment({
            name: "",
            description: "",
            header: ""
        });
    }
    const handleCancelAdd = () => {
        setIsAdding(false);
    }

    const handleSaveNew = async () => {
        try {
            const dataToSend = { ...newDepartment };

            if (!dataToSend.header) {
                delete dataToSend.header;
            }
            const response = await axios.post("http://localhost:5000/api/department/create", dataToSend, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                const createdDept = response.data.data;
                if (createdDept.header) {
                    createdDept.header = {
                        _id: createdDept.header,
                        name: users.find(user => user._id === createdDept.header).name
                    }
                };
                await fetchData();
                showAlert("Department created successfully", "success");
                setDepartments([...departments, createdDept]);
                setIsAdding(false);
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleInputChange = (e, field) => {
        setEditForm({
            ...editForm,
            [field]: e.target.value
        })
    }
    const handleNewDepartmentChange = (e, field) => {
        setNewDepartment({
            ...newDepartment,
            [field]: e.target.value
        })
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Departments Manger</h1>
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-300"
                    onClick={handleAddNew}
                >
                    <MdAdd />
                    <span>Add New Department</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-indigo-100 dark:border-slate-700">
                <div className="p-4 border-b border-indigo-100 dark:border-slate-700 bg-indigo-50 dark:bg-slate-800">
                    <div className="flex items-center space-x-4">
                        <input
                            type="text"
                            className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white"
                            placeholder="Search accounts..."
                        />
                        <select className="pl-4 pr-4 py-2 rounded-lg border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-800 dark:text-white">
                            <option value="">All Departments</option>
                            {departments.map(department => (
                                <option key={department._id} value={department._id}>{department.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-indigo-100 dark:divide-slate-700">
                    <thead className="bg-indigo-50 dark:bg-slate-700">
                        <tr className='dark:border-neutral-700'>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Header</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-indigo-100 dark:divide-slate-600 dark:bg-slate-800">
                        {departments.map((department, index) => (
                            <tr key={department._id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{index + 1}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === department._id ? (
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => handleInputChange(e, 'name')}
                                            className='w-full px-2 py-1 border dark:bg-neutral-800 dark:border-neutral-600 dark:text-white rounded'
                                        />
                                    ) : (
                                        <div className="text-sm text-neutral-500 dark:text-white">{department.name}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === department._id ? (
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={(e) => handleInputChange(e, 'description')}
                                            className='w-full px-2 py-1 border dark:bg-neutral-800 dark:border-neutral-600 dark:text-white rounded'
                                        />
                                    ) : (
                                        <div className="text-sm  text-indigo-800 dark:text-indigo-200">{department.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === department._id ? (
                                        <select
                                            value={editForm.header}
                                            onChange={(e) => handleInputChange(e, 'header')}
                                            className='w-full px-2 py-1 border dark:bg-neutral-800 dark:border-neutral-600 dark:text-white rounded'
                                        >
                                            <option value="">Select Header</option>
                                            {users.map(user => (
                                                <option key={user._id} value={user._id}>{user.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="text-sm text-neutral-500 dark:text-white">{department.header?.name}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-2">
                                        {editingId === department._id ? (
                                            <>
                                                <button
                                                    onClick={() => handleSaveEdit(department._id)}
                                                    className='text-green-600 hover:text-green-900'
                                                >
                                                    <MdSave className='text-xl' />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className='text-red-600 hover:text-red-900'
                                                >
                                                    <MdCancel className='text-xl' />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(department)}
                                                    className='text-blue-600 hover:text-blue-900'
                                                >
                                                    <MdEdit className='text-xl' />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className='text-red-600 hover:text-red-900'
                                                >
                                                    <MdDelete className='text-xl' />
                                                </button>
                                            </>
                                        )}
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
                                        value={newDepartment.name}
                                        onChange={(e) => handleNewDepartmentChange(e, 'name')}
                                        className="w-full px-3 py-2 border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-indigo-800 dark:text-white outline-none"
                                        placeholder='Department Name'
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        value={newDepartment.description}
                                        onChange={(e) => handleNewDepartmentChange(e, 'description')}
                                        className="w-full px-3 py-2 border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-indigo-800 dark:text-white outline-none"
                                        placeholder='Description'
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={newDepartment.header}
                                        onChange={(e) => handleInputChange(e, 'header')}
                                        className="w-full px-3 py-2 border border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-indigo-800 dark:text-white outline-none"
                                    >
                                        <option value="">Select Header</option>
                                        {users.map(user => (
                                            <option key={user._id} value={user._id}>{user.name}</option>
                                        ))}
                                    </select>
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

export default Department;