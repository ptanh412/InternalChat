import React, { createContext, useContext, useState, useEffect, use } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAlert } from "./AlertContext";
import { useNavigate } from "react-router-dom";
import { useDialog } from "./DialogContext ";
import { CleanupHandler } from "../utils/cleanupHandler.js";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [cleanupHandler, setCleanupHandler] = useState(null);
    const { showAlert } = useAlert();
    const navigate = useNavigate();

    let dialogContext = null;
    try {
        dialogContext = useDialog();
    } catch (error) {
        console.error("Dialog context not found", error);
    }    useEffect(() => {
        const storedUser = localStorage.getItem("userData");
        const token = localStorage.getItem("token");

        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                if (window.location.pathname !== "/login") {
                    connectSocket(token);
                }
            } catch (error) {
                console.error("Error getting user data", error);
                localStorage.removeItem("userData");
                localStorage.removeItem("token");
                setUser(null);
            }
        };

        setLoading(false);

        // Cleanup function
        return () => {
            if (cleanupHandler) {
                cleanupHandler.destroy();
            }
        };
    }, []);

    // Separate effect to handle cleanup handler updates
    useEffect(() => {
        if (socket && user) {
            // Clean up previous handler
            if (cleanupHandler) {
                cleanupHandler.destroy();
            }
            
            // Create new cleanup handler
            const handler = new CleanupHandler(socket, user);
            setCleanupHandler(handler);
            
            return () => {
                handler.destroy();
            };
        }
    }, [socket, user]);const connectSocket = (token) => {

        if (socket) {
            socket.disconnect();
        }
        const newSocket = io("http://localhost:5000", {
            auth: {
                token
            },
            autoConnect: false,
            // Enhanced connection options for better disconnect detection
            timeout: 20000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            maxReconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            // console.log("Socket connected");
            newSocket.emit('get:user-status');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            
            // If disconnect is due to server shutdown or transport close
            if (reason === 'transport close' || reason === 'io server disconnect') {
                // Update user status locally to offline
                if (user) {
                    updateUserData({ status: 'offline' });
                }
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error', err.message);
            
            // If connection fails, set user status to offline
            if (user) {
                updateUserData({ status: 'offline' });
            }
        });

        newSocket.on('reconnect_failed', () => {
            console.log('Socket reconnection failed');
            
            // Set user status to offline when reconnection fails
            if (user) {
                updateUserData({ status: 'offline' });
            }
        });

        newSocket.on('user:status', (data) => {
            // console.log('user:status event received', data);
            setOnlineUsers(prev => ({
                ...prev,
                [data.userId]: data.status
            }))

            if (data.userId === user?._id) {
                updateUserData({ status: data.status });
            }
        });

        newSocket.on('user:status-bulk', (data) => {
            const newStatus = {};
            data.forEach(user => {
                newStatus[user.userId] = user.status;
            });

            setOnlineUsers(prev => ({
                ...prev,
                ...newStatus
            }))
        })

        newSocket.on('account:deactivated', (data) => {
            console.log('account:deactivated event received', data);
            updateUserData({ active: false });
            setOnlineUsers(prev => ({
                ...prev,
                [data.userId]: data.active ? "online" : "offline"
            }))
            if (dialogContext) {
                dialogContext.showDialog({
                    title: data.active ? "Account Deactivated" : "Account Reactivated",
                    message: data.message,
                    onConfirm: () => {
                        if (!data.active) {
                            logout();
                            navigate("/login"); // Redirect to home instead of login
                        } else {
                            dialogContext.hideDialog();
                        }
                    },
                })
            } else {
                showAlert(data.message, data.active ? "success" : "error");
                if (!data.active) {
                    if (window.confirm(data.message)) {
                        logout();
                        navigate("/login"); // Redirect to home instead of login
                    } else {
                        logout();
                        navigate("/login"); // Redirect to home instead of login
                    }
                }
            }
        });        newSocket.on('user:updated', (data) => {
            console.log('user:updated event received', data);
            const userId = data.userId;
            const updatedFields = data.updateFields;
            if (userId === user?._id) {
                updateUserData(updatedFields);
            }
        });

        newSocket.on('user:status-success', (data) => {
            if (data.user && data.user._id === user?._id) {
                updateUserData(data.user);
            }
        });
        
        newSocket.connect();
        setSocket(newSocket);
        return newSocket;
    }
    const updateUserData = (updatedFields) => {
        setUser(prev => ({ ...prev, ...updatedFields }));

        const storedUser = JSON.parse(localStorage.getItem("userData"));
        if (storedUser) {
            const updatedUser = { ...storedUser, ...updatedFields };
            localStorage.setItem("userData", JSON.stringify(updatedUser));
        }
    }
    const login = async (email, password) => {
        try {
            const response = await axios.post("http://localhost:5000/api/auth/login", {
                email,
                password
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                const userData = response.data.data;
                const token = userData.token;
                const userInfo = userData.user;

                userInfo.status = "online";

                localStorage.setItem("token", token);
                localStorage.setItem("userData", JSON.stringify(userInfo));

                setUser(userInfo);

                connectSocket(token);

                return {
                    success: true,
                    message: response.data.message,
                    user: userInfo,
                    isAdmin: userInfo.role.name === "admin",
                    token: token
                }
            } else {
                return {
                    success: false,
                    message: response.data.message
                }
            }
        } catch (error) {
            console.error("Login error", error);
            return {
                success: false,                message: error.response.data.message || "Error logging in"
            }
        }
    };    const logout = () => {
        // Clean up the cleanup handler
        if (cleanupHandler) {
            cleanupHandler.destroy();
            setCleanupHandler(null);
        }

        if (socket && socket.connected) {
            try {
                // Send logout event to server
                socket.emit('user:logout');
                // Give the server a moment to process the logout
                setTimeout(() => {
                    socket.disconnect();
                }, 100);
            } catch (error) {
                console.error('Error during socket logout:', error);
                socket.disconnect();
            }
        }

        localStorage.removeItem("token");
        localStorage.removeItem("userData");

        setUser(null);
        setSocket(null);
        setOnlineUsers({});
    };

    const getUserStatus = (userId) => {
        // console.log("Get user status", userId, user?._id, onlineUsers[userId]);

        if (userId === user?._id) {
            return user?.status || "offline";
        }
        if (onlineUsers[userId] !== undefined) {
            return onlineUsers[userId];
        }
        return "offline";
    };

    const refreshUserStatus = () => {
        if (socket && socket.connected) {
            socket.emit('get:user-status');
        }
    }

    const value = {
        user,
        setUser,
        login,
        logout,
        socket,
        onlineUsers,
        loading,
        getUserStatus,
        connectSocket,
        refreshUserStatus,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);

    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }

    return context;
}
