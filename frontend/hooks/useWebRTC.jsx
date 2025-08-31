import { useCallback, useRef, useState, useEffect } from 'react';
import { useAlert } from '../src/context/AlertContext';

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
    ],
};

const useWebRTC = (socket, userId) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [pendingCandidates, setPendingCandidates] = useState([]);
    const peerConnectionRef = useRef(null);
    const isInitiatorRef = useRef(false);
    const currentCallRef = useRef(null);
    const { showAlert } = useAlert();
      const getMediaStream = useCallback(async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === "video" ? { facingMode: 'user' } : false,
                audio: true
            });
            // console.log('Media stream obtained:', stream);
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Error accessing media devices:", error);
            showAlert(`Error accessing media devices: ${error.message}`, 'error');
            return null;
        }
    }, [showAlert]);

    const stopLocalStream = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
    }, [localStream]);    const destroyPeerConnection = useCallback(() => {
        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (error) {
                console.error('Error destroying peer connection:', error);
            }
            peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        currentCallRef.current = null;
        isInitiatorRef.current = false;
        setPendingCandidates([]);
    }, []);

    const createPeerConnection = useCallback((callId, recipientId) => {
        console.log('Creating peer connection for call:', callId, 'Recipient ID:', recipientId);
        if (!window.RTCPeerConnection) {
            console.error('WebRTC is not supported in this browser');
            showAlert('WebRTC is not supported in this browser', 'error');
            return null;
        }

        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Generated ICE candidate:', event.candidate);
                socket.emit('signal', {
                    callId: callId,
                    signalData: {
                        type: 'candidate',
                        candidate: event.candidate
                    },
                    recipientId: recipientId
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                showAlert('Connection failed or disconnected', 'error');
                destroyPeerConnection();
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', pc.iceGatheringState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc.iceConnectionState);
        };

        return pc;
    }, [socket, destroyPeerConnection, showAlert]);

    const initPeerConnection = useCallback(async (initiator, stream, callId, recipientId) => {
        try {
            console.log('Initializing peer connection:', {
                callId,
                recipientId,
                initiator,
                hasStream: !!stream,
                streamTracks: stream ? stream.getTracks().map(track => ({ kind: track.kind, enabled: track.enabled })) : []
            });
            isInitiatorRef.current = initiator;
            currentCallRef.current = callId;

            const pc = createPeerConnection(callId, recipientId);
            if (!pc) {
                throw new Error('Failed to create peer connection');
            }

            if (stream) {
                // console.log('Adding tracks to peer connection');
                stream.getTracks().forEach(track => {
                    // console.log('Adding track:', track.kind, track.enabled);
                    pc.addTrack(track, stream);
                });
            }

            peerConnectionRef.current = pc;

            if (initiator) {
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: stream && stream.getVideoTracks().length > 0
                });
                await pc.setLocalDescription(offer);
                socket.emit('signal', {
                    callId: callId,
                    signalData: {
                        type: 'offer',
                        offer: offer
                    },
                    recipientId: recipientId
                });
            }
            return pc;
        } catch (error) {
            console.error('Error creating peer connection:', error);
            showAlert(`Error creating peer connection: ${error.message}`, 'error');
            return null;
        }
    }, [socket, createPeerConnection, showAlert]);

    const handleSignal = useCallback(async (signalData) => {
        const pc = peerConnectionRef.current;
        if (!pc) {
            console.error('No peer connection available for signaling');
            return;
        }

        try {
            if (signalData.type === 'offer') {
                await pc.setRemoteDescription(signalData.offer);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log('Created answer:', answer);
                socket.emit('signal', {
                    callId: currentCallRef.current,
                    signalData: {
                        type: 'answer',
                        answer: answer
                    },
                    recipientId: signalData.senderId
                });

                // Process any pending candidates after setting remote description
                if (pendingCandidates.length > 0) {
                    for (const candidate of pendingCandidates) {
                        try {
                            await pc.addIceCandidate(candidate);
                        } catch (error) {
                            console.error('Error adding pending candidate:', error);
                        }
                    }
                    setPendingCandidates([]);
                }
            } else if (signalData.type === 'answer') {
                await pc.setRemoteDescription(signalData.answer);

                // Process any pending candidates after setting remote description
                if (pendingCandidates.length > 0) {
                    console.log('Processing pending candidates:', pendingCandidates.length);
                    for (const candidate of pendingCandidates) {
                        try {
                            await pc.addIceCandidate(candidate);
                        } catch (error) {
                            console.error('Error adding pending candidate:', error);
                        }
                    }
                    setPendingCandidates([]);
                }
            } else if (signalData.type === 'candidate') {

                // If we don't have remote description yet, queue the candidate
                if (!pc.remoteDescription) {
                    console.log('Queueing candidate - no remote description yet');
                    setPendingCandidates(prev => [...prev, signalData.candidate]);
                } else {
                    await pc.addIceCandidate(signalData.candidate);
                }
            }
        } catch (error) {
            console.error('Error handling signal:', error);
            showAlert(`Error handling signal: ${error.message}`, 'error');
        }
    }, [socket, showAlert, pendingCandidates]);

    const startCall = useCallback(async (callId, callType, recipientId) => {

        if (peerConnectionRef.current) {
            console.warn('Peer connection already exists. Destroying it before starting a new call.');
            destroyPeerConnection();
        }

        if (!recipientId) {
            console.error('Recipient ID is required to start a call');
            showAlert('Recipient ID is required to start a call', 'error');
            return false;
        }

        if (!socket || !socket.connected) {
            console.error('Socket is not connected');
            showAlert('Connection error. Please try again.', 'error');
            return false;
        }

        try {
            const stream = await getMediaStream(callType);
            if (!stream) {
                console.error('Failed to get media stream');
                socket.emit('call:end', {
                    callId,
                    status: 'failed'
                });
                return false;
            }

            const pc = await initPeerConnection(true, stream, callId, recipientId);

            if (!pc) {
                console.error('Failed to initialize peer connection');
                socket.emit('call:end', {
                    callId,
                    status: 'failed'
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error starting call:', error);
            showAlert(`Error starting call: ${error.message}`, 'error');
            socket.emit('call:end', {
                callId,
                status: 'failed'
            });
            return false;
        }
    }, [getMediaStream, initPeerConnection, destroyPeerConnection, socket, showAlert]);    const answerCall = useCallback(async (callId, callType, initiatorId) => {
        console.log('📞 Answering call:', callId, 'Type:', callType, 'Initiator ID:', initiatorId);
        if (peerConnectionRef.current) {
            console.warn('Already has a peer connection when trying to answer.');
            destroyPeerConnection();
        }

        try {
            console.log('📡 Emitting call:answer event immediately');
            socket.emit('call:answer', { callId });

            const stream = await getMediaStream(callType);
            if (!stream) {
                console.error('Failed to get media stream');
                socket.emit('call:decline', {
                    callId,
                    status: 'failed'
                });
                return false;
            }
            
            const pc = await initPeerConnection(false, stream, callId, initiatorId);

            if (!pc) {
                console.error('Failed to initialize peer connection');
                socket.emit('call:decline', {
                    callId,
                    status: 'failed'
                });
                return false;
            }

            console.log('✅ Peer connection ready, waiting for offer via signaling...');
            return true;
        } catch (error) {
            console.error('Error answering call:', error);
            showAlert(`Error answering call: ${error.message}`, 'error');
            socket.emit('call:decline', {
                callId,
                status: 'failed'
            });
            return false;
        }
    }, [getMediaStream, initPeerConnection, destroyPeerConnection, socket, showAlert]);

    const setCurrentCallRef = useCallback((callId) => {
        currentCallRef.current = callId;
    }, []); 
      const endCall = useCallback(() => {
        stopLocalStream();
        destroyPeerConnection();
        setPendingCandidates([]);
        // Reset current call reference
        currentCallRef.current = null;
    }, [stopLocalStream, destroyPeerConnection]);
      useEffect(() => {
        if (!socket) return;
        const signalHandler = (data) => {
            const { callId, signalData } = data;
            console.log('📡 Received signal:',  `Call ID: ${callId}, Type: ${signalData.type}, Sender ID: ${data.senderId}`);
            
            if (!signalData || !signalData.type) {
                console.error('❌ Invalid signal data structure:', data);
                return;
            }

            // If no currentCallRef and this is an offer, set it
            if (!currentCallRef.current && signalData.type === 'offer') {
                currentCallRef.current = callId;
                console.log('🔗 Set current call ref to:', callId);
            }

            // Check callId match - but allow if currentCallRef is null and this is an offer
            if (currentCallRef.current && currentCallRef.current !== callId) {
                console.warn(`❌ Received signal for wrong callId. Expected ${currentCallRef.current}, got ${callId}`);
                return;
            }

            // Process all signals immediately if we have a peer connection
            if (peerConnectionRef.current) {
                console.log('⚡ Processing signal immediately');
                handleSignal({ ...signalData, senderId: data.senderId });
            } else {
                console.log('❌ No peer connection available, ignoring signal:', signalData.type);
            }
        };

        socket.on('signal', signalHandler);

        return () => {
            socket.off('signal', signalHandler);
        };
    }, [socket, handleSignal]);

    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]); 
    
    return {
        localStream,
        remoteStream,
        startCall,
        answerCall,
        endCall,
        setCurrentCallRef,
        toggleAudio: () => {
            if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = !track.enabled;
                });
            }
        },
        toggleVideo: () => {
            if (localStream) {
                localStream.getVideoTracks().forEach(track => {
                    track.enabled = !track.enabled;
                });
            }
        },
        isPeerConnected: peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected'
    };
};

export default useWebRTC;