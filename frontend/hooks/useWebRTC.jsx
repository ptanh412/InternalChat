
import { useCallback, useRef, useState, useEffect } from 'react';
import { useAlert } from '../src/context/AlertContext';
import Peer from 'simple-peer'; // npm install simple-peer


const iceServers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302',
        },
        {
            urls: 'stun:stun1.l.google.com:19302',
        },
        {
            urls: 'stun:stun2.l.google.com:19302',
        },
        {
            urls: 'stun:stun3.l.google.com:19302',
        },
    ],
};

const useWebRTC = (socket, userId) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peerConnectionRef = useRef(null);
    const isInitiatorRef = useRef(false);
    const currentCallRef = useRef(null);
    const { showAlert } = useAlert()

    const getMediaStream = useCallback(async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === "video" ? { facingMode: 'user' } : false,
                audio: true
            });
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Error accessing media devices.", error);
        }
    }, []);

    const stopLocalStream = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
    }, [localStream]);

    const destroyPeerConnection = useCallback(() => {
        if (peerConnectionRef.current) {
            console.log('Destrpying peer connection');
            peerConnectionRef.current.destroy();
            peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        currentCallRef.current = null;
        isInitiatorRef.current = false;
    }, []);

    const initPeerConnection = useCallback((initiator, stream, callId, recipientId) => {
        isInitiatorRef.current = initiator;
        currentCallRef.current = callId;

        const peer = new Peer({
            initiator: initiator,
            stream: stream,
            trickle: false,
            config: iceServers
        });

        peer.on('signal', (data) => {
            console.log('Gernerated WebRTC signal:', data);

            if (currentCallRef.current && recipientId) {
                socket.emit('signal', {
                    callId: currentCallRef.current,
                    signalData: data,
                    recipientId: recipientId
                });
            } else {
                console.warn('No callId or recipientId found');
            }
        });

        peer.on('stream', (stream) => {
            console.log('Received remote stream');
            setRemoteStream(stream);
        });

        peer.on('connect', () => {
            console.log('Peer connection established');
        });

        peer.on('close', () => {
            console.log('Peer connection closed');
            destroyPeerConnection();
            stopLocalStream();
        });

        peer.on('error', (error) => {
            console.error('Peer connection error:', error);
            showAlert('error', 'Peer connection error: ' + error.message);
            destroyPeerConnection();
        });

        peerConnectionRef.current = peer;
        return peer;
    }, [socket, destroyPeerConnection, stopLocalStream, showAlert]);

    const startCall = useCallback(async (callId, callType, recipientId) => {
        if (peerConnectionRef.current) {
            console.warn('Peer connection already exists. Destroying it before starting a new call.');
            return false;
        }
        if (!recipientId) {
            console.error('Recipient ID is required to start a call');
            return false;
        }

        const stream = await getMediaStream(callType);
        if (!stream) {
            socket.emit('call:end', {
                callId,
                status: 'failed'
            });
            return false;
        }
        console.log('Starting call with ID:', callId);

        const peer = initPeerConnection(true, stream, callId, recipientId);
        return peer;
    }, [getMediaStream, initPeerConnection]);

    const answerCall = useCallback(async (callId, callType, initiatorId, incomingOffer) => {
        if (peerConnectionRef.current) {
            console.warn('Already has a peer connection when trying to answer.');
            return false;
        }
        if (!incomingOffer) {
            console.error('Incoming offer is required to answer a call');
            return false;
        }
        const stream = await getMediaStream(callType);
        if (!stream) {
            socket.emit('call:decline', {
                callId,
                status: 'failed'
            });
            return false;
        }
        console.log('Answering call with ID:', callId);

        const peer = initPeerConnection(false, stream, callId, initiatorId);
        peer.signal(incomingOffer);
        return true;
    }, [getMediaStream, initPeerConnection]);

    const handleIncomingSignal = useCallback((data) => {
        console.log('Received incoming signal:', data);
        const { callId, signalData, senderId } = data;

        if (currentCallRef.current !== callId) {
            console.warn(`Received signal for wrong callId. Expected ${currentCallIdRef.current}, got ${callId}`);
            return;
        };
        const peer = peerConnectionRef.current;

        if (peer){
            console.log('Signaling peer with data:', signalData);
            peer.signal(signalData);
        }else {
            console.error('Peer connection not found. Cannot signal.');

        }
    },[])

    const endCall = useCallback(() => {
        console.log('Ending call...');
        stopLocalStream();
        destroyPeerConnection();
    }, [stopLocalStream, destroyPeerConnection]);

    useEffect(() => {
        if (!socket) return;

        socket.on('signal', handleIncomingSignal);

        return () => {
            socket.off('signal', handleIncomingSignal);
        };
    }, [socket, handleIncomingSignal]);

    useEffect(() => {
        return () => {
            console.log('useWebRTC cleanup: Ending call on component unmount.');
            endCall()
        }
    },[endCall]);;
    return {
        localStream,
        remoteStream,
        startCall,
        answerCall,
        endCall,
        toggleAudio: () => {
            if (localStream){
                localStream.getAudioTracks().forEach(track => track.enable = !track.enable);

            }
        },
        toggleVideo: () => {
            if (localStream){
                localStream.getVideoTracks().forEach(track => track.enable = !track.enable);
            }
        },
        isPeerConnected: peerConnectionRef.current && peerConnectionRef.current.connected
    }
};

export default useWebRTC;