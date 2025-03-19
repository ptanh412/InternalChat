let socketInstance = null;

const setSocketInstance = (socket) =>{
    socketInstance = socket;
}

const getSocket = () =>{
    if (!socketInstance){
        throw new Error('Socket instance not set');
    }

    return socketInstance;
};

module.exports = {
    setSocketInstance,
    getSocket
}