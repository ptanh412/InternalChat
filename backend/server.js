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
const server = http.createServer(app);

const io = setUpSocket(server);
app.set('socketio', io);
app.use(cors({
	origin: process.env.CLIENT_URL
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/role', roleRoutes);
app.use('/api/department', departmentRoutes);


const PORT = process.env.PORT;
server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});