import axios from "axios";
import { useState } from "react";
import { MdClose, MdOutlineVpnKey } from "react-icons/md";
import { useAlert } from '../../context/AlertContext'

const ChangePassword = ({ onClose }) => {
    const {showAlert} = useAlert();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert('All fields are required', 'error');
            setError('All fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('New password and confirm password do not match', 'error');
            setError('New password and confirm password do not match');
            return;
        }
        if (newPassword.length < 6) {
            showAlert('New password must be at least 6 characters long', 'error');
            setError('New password must be at least 6 characters long');
            return;
        }
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/change-password', {
                currentPassword,
                newPassword
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.data.success) {
                showAlert(response.data.message, 'success');
                setSuccess(response.data.message);

                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');

                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setError('Failed to change password. Please try again later.');
            showAlert('Failed to change password. Please try again later.', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6 relative w-full max-w-md">
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={onClose}
                >
                    <MdClose className="text-xl" />
                </button>

                <div className="flex items-center space-x-2 mb-6">
                    <MdOutlineVpnKey className="text-2xl text-blue-500 dark:text-blue-400" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-2">Change Password</h2>
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4">
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4">
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4 space-y-3">
                        <label
                            htmlFor="currentPassword"
                            className="block text-sm font-medium text-neutral-700 dark:text-white mb-1"
                        >
                            Current Password
                        </label>
                        <input
                            type="password"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                            placeholder="Enter current password"
                        />
                    </div>
                    <div className="mb-4 space-y-3">
                        <label
                            htmlFor="newPassword"
                            className="block text-sm font-medium text-neutral-700 dark:text-white mb-1"
                        >
                            New Password
                        </label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div className="mb-4 space-y-3">
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-neutral-700 dark:text-white mb-1"
                        >
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full pl-4 pr-4 py-2 rounded-lg border border-neutral-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                            placeholder="Confirm new password"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-white bg-gray-200 dark:bg-neutral-700 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-white bg-gray-200 dark:bg-purple-700 rounded-lg hover:bg-gray-300 dark:hover:bg-purple-600 transition-all duration-200"
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
};
export default ChangePassword;