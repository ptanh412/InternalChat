const { Server } = require('socket.io');
const socketAuth = require('../middlewares/socketAuth');
const Users = require('../models/Users');
const Typing = require('../models/Typing');
const Notifications = require('../models/Notifications');
const setUpSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: process.env.CLIENT_URL,
			methods: ['GET', 'POST']
		},
	});

	const userSocketMap = new Map();
	const socketUserMap = new Map();

	io.use(socketAuth);
	io.on('connection', async (socket) => {
		console.log(`User connected: ${socket.userId}`);

		await Users.findByIdAndUpdate(socket.userId, {
			status: 'online',
			lastActive: new Date()
		});

		userSocketMap.set(socket.userId, socket.id);
		socketUserMap.set(socket.id, socket.userId);

		const unreadCount = await Notifications.countDocuments({
			received: socket.userId,
			isRead: false
		});

		socket.emit('notification:count', {count: unreadCount});

		socket.on('notification:read', async (data) =>{
			try{
				if (data.notificationId){
					await Notifications.findByIdAndUpdate(
						{ _id: data.notificationId, received: socket.userId },
						{ isRead: true }
					)
				}else {
					await Notifications.updateMany(
						{received: socket.userId, isRead: false},
						{isRead: true}
					)
				}

				const newCount = await Notifications.countDocuments({
					received: socket.userId,
					isRead: false
				});

				socket.emit('notification:count', {count: newCount});
			}catch{
				console.error('Error marking notification as read', error);
			}
		})

		socket.broadcast.emit('user:status', {
			userId: socket.userId,
			status: 'online'
		})

		socket.on('user:logout', async () =>{
			console.log(`User logged out: ${socket.userId}`);
			await Users.findByIdAndUpdate(socket.userId,{
				status: 'offline',
				lastActive: new Date()
			});
			socket.broadcast.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			});
			socket.disconnect(true);
		})

		socket.on('disconnect', async () => {
			console.log(`User disconnected: ${socket.userId}`);

			await Users.findByIdAndUpdate(socket.userId, {
				status: 'offline',
				lastActive: new Date()
			});

			userSocketMap.delete(socket.userId);
			socketUserMap.delete(socket.id);

			socket.broadcast.emit('user:status', {
				userId: socket.userId,
				status: 'offline'
			});
			await Typing.deleteMany({ userId: socket.userId });
		});
	});

	const sendNotification = async (notification) =>{
		try{
			const newNotification = await notification.save();

			const populatedNotification = await Notifications.findById(newNotification._id)
			.populate('sender', 'name avatar')
			.populate('received', 'name avatar');

			const recipientSocketId = userSocketMap.get(notification.received.toString());

			if (recipientSocketId){
				io.to(recipientSocketId).emit('notification:new', populatedNotification);

				const count = await Notifications.countDocuments({
					received: notification.received,
					isRead: false
				});

				io.to(recipientSocketId).emit('notification:count', {count});
			}	
		}catch{
			console.error('Error sending notification', error);
		}
	}

	return {
		io,
		sendNotification
	};
}

module.exports = setUpSocket;