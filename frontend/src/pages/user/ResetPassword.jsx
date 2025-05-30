import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAlert } from "../../context/AlertContext";

const ResetPassword = () => {
    const { showAlert } = useAlert();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            showAlert("Passwords do not match", "error");
            return;
        }

        if (password.length < 6) {
            showAlert("Password must be at least 8 characters long", "error");
            return;
        }

        setIsSubmitting(true);
        const API_URL = import.meta.env.VITE_API_URL;
        console.log("API URL:", `${API_URL}/api/auth/forgot-password`);

        try {
            const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
                token,
                newPassword: password
            });

            if (response.data.success) {
                showAlert("Password reset successful", "success");
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Error reset password";
        
            showAlert(errorMessage, "error");
        
            if (errorMessage.includes("Token expired")) {
                setTimeout(() => {
                    navigate('/forgot-password');
                }, 3000);
            }
        }finally {
            setIsSubmitting(false);
        }
    }
    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-black to-gray-700">
                <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg from-black to-purple-900 p-6">
                    <h1 className="text-3xl font-bold mb-4 text-center text-white">Invalid Token</h1>
                    <p className="text-center text-white">The token is invalid or has expired. Please try again.</p>

                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="mt-4 w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                    >
                        Request a new token
                    </button>
                </div>
            </div>
        )
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-black to-gray-700">
            <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg from-black to-purple-900 p-6">
                <h1 className="text-3xl font-bold mb-4 text-center text-white">Reset Password</h1>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col space-y-3 my-3">
                        <label className="text-xl font-semibold text-white">New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            className="border pl-7 py-2 rounded-lg w-ful"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isSubmitting}
                            minLength={6}
                        />
                    </div>
                    <div className="flex flex-col space-y-3 my-3">
                        <label className="text-xl font-semibold text-white">Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            className="border pl-7 py-2 rounded-lg w-full"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isSubmitting}
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                    >
                        {isSubmitting ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;