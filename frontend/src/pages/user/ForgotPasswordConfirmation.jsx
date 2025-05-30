import { useNavigate } from "react-router-dom"

const ForgotPasswordConfirmation = () => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-black to-gray-700">
            <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg from-black to-purple-900 p-6">
                <h1 className="text-3xl font-bold mb-4 text-white">
                    Please check your email for the password reset link
                </h1>

                <div className="mb-6 text-neutral-300">
                    <p className="mb-3">
                        If you don't see the email, please check your spam or junk folder.
                    </p>
                    <p className="mb-3"> 
                        Please check your email for the password reset link and click on it to reset your password. Link will expire in 1 hour.
                    </p>
                    <p className="mb-3">
                        If you still don't see it, please try again or contact support.
                    </p>
                </div>

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                    >
                        Back to Login
                    </button>

                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                    >
                        Resend Password Reset Link
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ForgotPasswordConfirmation;