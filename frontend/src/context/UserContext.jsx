import React, { createContext, useContext, useState, useEffect, use } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState([]);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState({});

    useEffect(() => {
        const storedUser = localStorage.getItem("userData");
        const token = localStorage.getItem("token");

        if (storedUser && token){
            try{
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
    
                if (window.location.pathname !== "/login"){
                    connectSocket(token);
                }
            }catch(error){
                console.error("Error getting user data", error);
                localStorage.removeItem("userData");
                localStorage.removeItem("token");
            }
        };

        setLoading(false);
    }, []);

    const connectSocket = (token) =>{

        if (socket){
            socket.disconnect();
        }
        const newSocket = io("http://localhost:5000", {
            auth: {
                token
            },
            autoConnect: false,
        });   
        
        newSocket.on('connect', () => {
            console.log("Socket connected");
        });

        newSocket.on('user:status', (data) =>{
            setOnlineUsers(prev =>({
                ...prev,
                [data.userId]: data.status
            }))

            if (data.userId === user._id){
                const userData = JSON.parse(localStorage.getItem("userData"));

                if (userData){
                    userData.status = data.status;
                    localStorage.setItem("userData", JSON.stringify(userData));
                }
            }
        });

        newSocket.on('connect_error', (err) =>{
            console.error('Socket connection error', err.message);
        });
        newSocket.connect();
        setSocket(newSocket);
        return newSocket;
    }
    const login = async (email, password) =>{
        try{
            const response = await axios.post("http://localhost:5000/api/auth/login", {
                email,
                password
            },{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success){
                const userData = response.data.data;
                const token = userData.token;
                const userInfo = userData.user;

                userInfo.status = "online";

                localStorage.setItem("token", token);
                localStorage.setItem("userData", JSON.stringify(userInfo));

                setUser(userInfo);

                connectSocket(token);

                return{
                    success: true,
                    message: response.data.message,
                    user: userInfo,
                    isAdmin: userInfo.role.name === "admin",
                    token: token
                }
            }else{
                return{
                    success: false,
                    message: response.data.message
                }
            }
        }catch(error){
            console.error("Login error", error);
            return{
                success: false,
                message: error.response.data.message || "Error logging in"
            }
        }
    }

    const logout = () =>{
        if (socket){
            socket.emit('user:logout');
            socket.disconnect();
        }

        localStorage.removeItem("token");
        localStorage.removeItem("userData");

        setUser(null);
        setSocket(null);
    };

    const getUserStatus = (userId) =>{
        if (userId === user._id){
            return user.status || "offline";
        }
        if(onlineUsers[userId]){
            return onlineUsers[userId];
        }
        return "offline";
    };
    const value = {
        user,
        setUser,
        login,
        logout,
        socket,
        onlineUsers,
        loading,
        getUserStatus,
        connectSocket
    };
    
    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);

    if (!context){
        throw new Error("useUser must be used within a UserProvider");
    }

    return context;
}
