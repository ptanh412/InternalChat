require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const setUpSocket = require('./socket/socket');
require('./config/db.js');
const app = express();
const authRoutes = require('./routes/authRoute');
const permissionRoutes = require('./routes/permissionRoute');
const roleRoutes = require('./routes/roleRoutes.js');
const departmentRoutes = require('./routes/departmentRoute');
const conversationRoutes = require('./routes/conversationRoute');
const userSettingRoute = require('./routes/userSettingRoute');
const messageRoute = require('./routes/messageRoute');
const notificationRoute = require('./routes/notificationRoute');
const fileRoute = require('./routes/fileRoute');
const server = http.createServer(app);
const socketService = require('./services/socketService');

const io = setUpSocket(server);
socketService.setSocketInstance(io);
app.set('socketio', io);
app.use(cors({
	origin: process.env.CLIENT_URL
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/role', roleRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/notification', notificationRoute);
app.use('/api/conversation', conversationRoutes);
app.use('/api/userSetting', userSettingRoute);
app.use('/api/message', messageRoute);
app.use('/api/file', fileRoute);


const PORT = process.env.PORT;

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
	console.log(`\n${signal} received. Starting graceful shutdown...`);
		try {
		// Get the socket instance
		const socketSetup = app.get('socketio');
		const io = socketSetup?.io || socketSetup; // Handle both direct io instance and setup object
		
		console.log('Socket setup object:', typeof socketSetup);
		console.log('IO instance type:', typeof io);
		console.log('IO emit function:', typeof io?.emit);
		
		if (io && typeof io.emit === 'function') {
			console.log('Socket.IO instance found, processing connected users...');
					// Set all connected users to offline
		const Users = require('./models/Users');
		const connectedUsers = [];
		
		// Try multiple methods to get connected users
		let socketsFound = false;
		
		// Method 1: Use io.sockets.sockets (Socket.IO v4 standard)
		if (io.sockets && io.sockets.sockets) {
			console.log(`Checking ${io.sockets.sockets.size} connected sockets`);
			
			io.sockets.sockets.forEach((socket) => {
				if (socket.userId) {
					connectedUsers.push(socket.userId);
					console.log(`Found connected user: ${socket.userId}`);
				}
			});
			socketsFound = true;
		}
		
		// Method 2: Fallback to adapter if Method 1 fails
		if (!socketsFound && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms) {
			console.log('Using adapter fallback method');
			try {
				for (const [socketId, socket] of io.sockets.adapter.sids) {
					const socketInstance = io.sockets.sockets.get(socketId);
					if (socketInstance && socketInstance.userId) {
						connectedUsers.push(socketInstance.userId);
						console.log(`Found connected user via adapter: ${socketInstance.userId}`);
					}
				}
				socketsFound = true;
			} catch (adapterError) {
				console.log('Adapter method failed:', adapterError.message);
			}
		}
		
		// Method 3: Set all online users to offline as a last resort
		if (!socketsFound) {
			console.log('Could not access connected sockets, setting all online users to offline');
			const onlineUsers = await Users.find({ status: 'online' }).select('_id');
			onlineUsers.forEach(user => {
				connectedUsers.push(user._id);
			});
		}
					// Update all connected users to offline status
			if (connectedUsers.length > 0) {
				console.log(`Setting ${connectedUsers.length} users to offline...`);
				
				await Users.updateMany(
					{ _id: { $in: connectedUsers } },
					{ 
						status: 'offline',
						lastActive: new Date()
					}
				);
						// Broadcast status updates to all connected clients
				console.log('Broadcasting status updates to connected clients...');
				try {
					connectedUsers.forEach(userId => {
						io.emit('user:status', {
							userId: userId,
							status: 'offline'
						});
					});
					console.log('Status updates broadcasted successfully');
				} catch (emitError) {
					console.error('Error broadcasting status updates:', emitError.message);
					// Continue with shutdown even if broadcast fails
				}
				
				console.log(`Successfully set ${connectedUsers.length} users to offline status`);
			} else {
				console.log('No connected users found to set offline');
			}			// Give clients time to receive the status updates
			console.log('Waiting for clients to receive status updates...');
			setTimeout(() => {
				// Close all socket connections and the HTTP server
				console.log('Closing Socket.IO server...');
				
				// Disconnect all connected sockets with error handling
				try {
					if (io.sockets && io.sockets.sockets) {
						console.log(`Disconnecting ${io.sockets.sockets.size} connected sockets`);
						io.sockets.sockets.forEach((socket) => {
							try {
								socket.disconnect(true);
							} catch (socketError) {
								console.log('Error disconnecting socket:', socketError.message);
							}
						});
					}
				} catch (disconnectError) {
					console.log('Error during socket disconnection:', disconnectError.message);
				}
				
				// Close the HTTP server (which will also close the Socket.IO server)
				server.close(() => {
					console.log('HTTP server and Socket.IO server closed');
					process.exit(0);
				});
			}, 1000);
		} else {
			// If no socket instance, just close the server
			server.close(() => {
				console.log('HTTP server closed');
				process.exit(0);
			});
		}
	} catch (error) {
		console.error('Error during graceful shutdown:', error);
		process.exit(1);
	}
};

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	gracefulShutdown('UNHANDLED_REJECTION');
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});