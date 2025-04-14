import axios from "axios";
import { useState, useEffect } from "react";
import { MdAdd, MdCancel, MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom"

const EditEmployee = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        address: "",
        position: "",
        department: ""
    });
    const [isAddmode, setIsAddmode] = useState(!id);
    const positions = ['Director', 'Deputy Director', 'Secretary', 'Department Head', 'Deputy Department', 'Project Leader', 'Administrator', 'Employee'];


    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/department", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.data.success) {
                    setDepartments(response.data.data);
                }
            } catch (error) {
                console.log("Failed to fetch departments: ", error);
            }
        }

        fetchDepartments();

        if (id) {
            const fetchAccountData = async () => {
                setIsLoading(true);

                try {
                    const response = await axios.get(`http://localhost:5000/api/auth/get-user/${id}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.data.success && response.data.data) {
                        const account = response.data.data;
                        setFormData({
                            name: account.name,
                            email: account.email,
                            phoneNumber: account.phoneNumber,
                            position: account.position,
                            department: account.department.name,
                        });
                    }
                } catch (error) {
                    console.log("Failed to fetch account data: ", error);
                } finally {
                    setIsLoading(false);
                }
            }
            fetchAccountData();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let response;
            if (isAddmode) {
                response = await axios.post("http://localhost:5000/api/auth/create-user", formData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
            } else {
                response = await axios.put(`http://localhost:5000/api/auth/update-user/${id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }

            if (response.data.success) {
                navigate("/accounts");
            }
        } catch (error) {
            console.log("Failed to create/update account: ", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleCancel = () => {
        navigate("/accounts");
    };

    if (isLoading && !isAddmode) {
        return <p>Loading...</p>
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="font-bold text-2xl dark:text-white">{isAddmode ? 'Add New Employee' : 'Edit Employee'}</h1>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 dark:bg-neutral-800">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
                        <div className="space-y-3">
                            <label
                                className="block text-sm font-medium text-neutral-700 mb-1 dark:text-white"
                            >
                                Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <label
                                className="block text-sm font-medium text-neutral-700 mb-1 dark:text-white"
                            >
                                Position
                            </label>
                            <select
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                                required
                            >
                                <option value="">Select Position</option>
                                {positions.map(position => (
                                    <option key={position} value={position}>{position}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label
                                className="block text-sm font-medium text-neutral-700 mb-1 dark:text-white"
                            >
                                Department
                            </label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label
                                className="block text-sm font-medium text-neutral-700 mb-1 dark:text-white"
                            >
                                Phone Number
                            </label>
                            <input
                                type="text"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <label
                                className="block text-sm font-medium text-neutral-700 mb-1 dark:text-white"
                            >
                                Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                                required
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end items-center space-x-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200"
                        >
                            <MdCancel className="text-xl" />
                            <span className="font-semibold">Cancel</span>
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex items-center space-x-2 bg-neutral-500 text-white px-4 py-2 rounded-lg hover:bg-neutral-600 transition-all duration-200"
                        >
                            {isAddmode ? <MdAdd className="text-xl" /> : <MdSave className="text-xl" />}
                            <span>{isAddmode ? 'Add Employee' : 'Update Employee'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
};

export default EditEmployee;