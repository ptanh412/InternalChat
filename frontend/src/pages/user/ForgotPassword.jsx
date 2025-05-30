import { useState } from "react"
import axios from "axios";
import { useAlert } from "../../context/AlertContext";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
    const { showAlert } = useAlert();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const API_URL = import.meta.env.VITE_API_URL;
        console.log("API URL:", `${API_URL}/api/auth/forgot-password`);
    
        try {
            const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            if (response.data.success) {
                showAlert("Password reset link sent to your email", "success");
                navigate('/forgot-password-confirmation');
            }
        } catch (error) {
            console.log("Forgot password error:", error);
            showAlert(error.response?.data?.message || "Something went wrong", "error");
        } finally {
            setIsSubmitting(false);
        }
    }    

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-black to-gray-700">
            <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg from-black to-purple-900 p-6">
                <h1 className="text-3xl font-bold mb-4 text-center text-white">Forgot Password</h1>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col space-y-3 my-3">
                        <label className="text-xl font-semibold text-white">Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="border pl-7 py-2 rounded-lg w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                    >
                        {isSubmitting ? "Sending..." : "Send Reset Link"}
                    </button>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-indigo-300 hover:text-indigo-500 transition-colors duration-300"
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;