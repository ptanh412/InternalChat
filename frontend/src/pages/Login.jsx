import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdOutlineEmail, MdWork, MdPhone } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { AlertContext } from "../context/AlertMessage";
import { useUser } from "../context/UserContext";

const Login = () => {
	const {login} = useUser();
	const { alertMessage, alertType, showAlert } = useContext(AlertContext);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigation = useNavigate();

	const handleLogin = async (e) => {
		e.preventDefault();
		try {
			const result = await login(email, password);

			if (result.success) {
				showAlert(result.message, "success");

				if (result.isAdmin) {
					navigation("/admin-home");
				}else{
					navigation("/")
				}

			} else {
				showAlert("Invalid email or password", "error");
			}
		} catch (error) {
			console.log(error);
			showAlert("Error", "error");
		}
	}
	return (
		<div className="flex items-center justify-center w-full h-screen bg-gradient-to-t from-[#D3A29D] via-[#A36361] via-[#E8B298] via-[#EECC8C] via-[#8DD1C5] to-[#9EABA2] animate-gradient-x">
			{alertMessage && (
				<div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
					<span className="text-center flex justify-center w-full items-center space-x-1 px-5">
						{alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
						<p className="text-sm">{alertMessage}</p>
					</span>
				</div>
			)}
			<div className="w-full max-w-md mx-auto shadow-2xl rounded-lg bg-white">
				<div className="relative grid grid-cols-2 text-lg w-full bg-gray-300 rounded-t-lg overflow-hidden">
					<div
						className={`absolute top-0 h-full w-1/2 bg-slate-950 transition-transform duration-1000 `}
					></div>
					<button
						className={`relative z-10 py-2 font-semibold text-white`}
					>
						Login
					</button>
				</div>
				<form className="p-6" onSubmit={handleLogin}>
					<h1 className="text-3xl font-bold mb-4 text-center text-black">Login</h1>
					<p className="text-gray-400 text-center">Enter your account information to log in</p>
					<div className="flex flex-col space-y-3 my-3">
						<label className="text-xl font-semibold text-black">Email</label>
						<div className="w-full relative">
							<MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
							<input
								type="email"
								placeholder="email@example.com"
								className="border pl-7 py-2 rounded-lg w-full text-black"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-col space-y-3 my-3">
						<label className="text-xl font-semibold text-black">Password</label>
						<div className="w-full relative">
							<CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
							<input
								type="password"
								className="border pl-7 py-2 rounded-lg w-full text-black"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter password"
							/>
						</div>
					</div>
					<Link to="/forgot-password" className='line-clamp-1 mb-5 ml-1 text-sm underline text-black'> Forgot password?</Link>
					<button
						type="submit"
						className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg hover:bg-slate-900"
					>
						Log in
					</button>
				</form>
			</div>
		</div>
	)
}

export default Login;