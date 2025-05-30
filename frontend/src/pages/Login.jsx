import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MdOutlineEmail, MdLock } from 'react-icons/md';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useUser } from '../context/UserContext'; // Adjust the path as needed
import logoImage from '../assets/chat.png'; // Replace with your actual logo path
import { useAlert } from '../context/AlertContext'

const Login = () => {
  const { login } = useUser();
  const { showAlert, navigateWithAlert } = useAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formatEmail = (value) => {
    if (value === "1050080043") {
      return `${value}@sv.hcmunre.edu.vn`;
    } else {
      return `${value}@gmail.com`;
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formattedEmail = formatEmail(email.trim().toLowerCase());
    try {
      const result = await login(formattedEmail, password);

      if (result.success) {
        if (result.isAdmin) {
          navigateWithAlert("/admin-home", "Login Successful!", "success");
        } else {
          if (result.user.active === true) {
            navigateWithAlert("/chat", "Login Successful!", "success");
          } else {
            showAlert("Your account is inactive. Please contact the administrator.", "error");
            navigateWithAlert("/login", "Login Failed!", "error");
          }
          // navigateWithAlert("/chat", "Login Successful!", "success");
        }
      } else {
        showAlert("Invalid email or password", "error");
        setIsLoading(false);
      }
    } catch (error) {
      console.log(error);
      showAlert("Error connecting to the server", "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-700 text-white">
      {/* Alert Message */}
      {/* {alertMessage && (
      

      {/* Login Card */}
      <div className="max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden from-black to-purple-900">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-black to-purple-900 py-6 px-8 text-center">
          <div className="mb-4 flex justify-center">
            {/* Replace with your actual logo */}
            <img src={logoImage} alt="Logo" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-blue-100 text-sm mt-1">Sign in to continue to your account</p>
        </div>

        {/* Login Form */}
        <div>

        </div>
        <form className="p-8" onSubmit={handleLogin}>
          <div className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdOutlineEmail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              onClick={handleLogin}
              disabled={isLoading}
              className={`w-full py-3 px-4 flex justify-center items-center rounded-lg text-white font-medium transition-all duration-300 ${isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-colors duration-500"
                }`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            <div className="text-center mt-4">
              <span className="text-sm text-gray-600">Forgot Password? </span>
              <Link to="/forgot-password" className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors">
                Click here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;