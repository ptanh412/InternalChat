let socketInstance = null;
let ioInstance = null;
let socketHelpers = {};

const setSocketInstance = (socket, io, helpers) =>{
    socketInstance = socket;
    ioInstance = io;

    if (helpers) {
        socketHelpers = helpers;
    }
}

const getSocket = () =>{
    if (!socketInstance){
        throw new Error('Socket instance not set');
    }

    return {
        ...socketInstance,
        ...socketHelpers,
        emit: (event, data) => {
            if (!socketInstance){
                throw new Error('Socket instance not set');
            }
            return socketInstance.emit(event, data);
        },
    }
};

const getIo = () => {
    if (!ioInstance) {
        throw new Error('IO instance not set');
    }
    console.log('IO instance: ', ioInstance);
    return ioInstance;
}

const emit = (event, data) => {
    if (!ioInstance){
        throw new Error('IO instance not set');
    }
    return ioInstance.emit(event, data);
}

module.exports = {
    setSocketInstance,
    getSocket,
    getIo,
    emit
}