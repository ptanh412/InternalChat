import React, { useRef, useEffect, useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff } from 'react-icons/fi';

const IncallUI = ({ callInfo, localStream, remoteStream, onEndCall, onToggleAudio, onToggleVideo, otherParticipant, isCallAnswered = false }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStartTime, setCallStartTime] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);    // Timer effect for call duration
    useEffect(() => {
        let interval = null;
        
        // Start timing when call is answered - don't wait for all streams
        if (isCallAnswered && !callStartTime) {
            setCallStartTime(Date.now());
        }
        
        // Run timer when we have start time
        if (callStartTime) {
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCallAnswered, callStartTime]);    // Update connection status based on streams and call answered state
    useEffect(() => {
        console.log('🎭 IncallUI Status Debug:', {
            isCallAnswered,
            hasLocalStream: !!localStream,
            hasRemoteStream: !!remoteStream,
            currentConnectionStatus: connectionStatus
        });

        if (isCallAnswered) {
            // Cuộc gọi đã được trả lời - chuyển sang connected ngay lập tức
            console.log('🎭 Setting status to CONNECTED (call answered)');
            setConnectionStatus('connected');
        } else if (localStream && !isCallAnswered) {
            // Người gọi có local stream nhưng chưa được trả lời
            console.log('🎭 Setting status to WAITING (caller waiting for answer)');
            setConnectionStatus('waiting');
        } else if (localStream || remoteStream) {
            // Đang khởi tạo stream
            console.log('🎭 Setting status to CONNECTING (initializing streams)');
            setConnectionStatus('connecting');
        } else {
            // Chưa có stream nào
            console.log('🎭 Setting status to INITIALIZING');
            setConnectionStatus('initializing');
        }
    }, [localStream, remoteStream, isCallAnswered]);

    // Format call duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };    // Get connection status text and color
    const getConnectionInfo = () => {
        switch (connectionStatus) {
            case 'initializing':
                return { text: 'Initializing...', color: 'text-yellow-400' };
            case 'waiting':
                return { text: 'Waiting for answer...', color: 'text-blue-400' };
            case 'connecting':
                return { text: 'Connecting...', color: 'text-blue-400' };
            case 'connected':
                return { text: formatDuration(callDuration), color: 'text-green-400' };
            default:
                return { text: 'Connecting...', color: 'text-blue-400' };
        }
    };

    const handleToggleAudio = () => {
        onToggleAudio();
        setIsMuted(prev => !prev);
    };

    const handleToggleVideo = () => {
        onToggleVideo();
        setIsVideoOff(prev => !prev);
    };    if (!callInfo) return null;    // Use the otherParticipant prop if provided, otherwise fallback to callInfo
    const displayParticipant = otherParticipant || callInfo.otherParticipant || callInfo.initiator;
    const connectionInfo = getConnectionInfo();

    return (
        <div className="absolute inset-0 bg-black dark:bg-neutral-900 z-30 flex flex-col items-center justify-center text-white">
            {/* Call Header with participant info and timer */}
            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
                            {displayParticipant?.avatar ? (
                                <img
                                    src={displayParticipant.avatar}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-white text-lg font-bold">
                                    {displayParticipant?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">
                                {displayParticipant?.name || 'Participant'}
                            </h3>
                            <p className={`text-sm font-medium ${connectionInfo.color}`}>
                                {connectionInfo.text}
                            </p>
                        </div>
                    </div>
                    
                    {/* Call type indicator */}
                    <div className="flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">
                            {callInfo.type === 'video' ? 'Video Call' : 'Voice Call'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="relative flex-grow w-full flex items-center justify-center bg-neutral-800 dark:bg-black overflow-hidden">
                {/* Remote video for video calls */}
                {callInfo.type === "video" && remoteStream && (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover absolute inset-0"
                    />
                )}
                
                {/* Local video for video calls - small preview */}
                {callInfo.type === "video" && localStream && (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute bottom-4 right-4 w-32 h-24 rounded-lg shadow-lg border-2 border-blue-500 object-cover z-10"
                    />
                )}
                
                {/* Voice call or no remote stream - show avatar/placeholder */}
                {(callInfo.type === "voice" || !remoteStream) && (
                    <div className="flex flex-col items-center text-stone-400">
                        <div className="w-32 h-32 rounded-full bg-neutral-700 flex items-center justify-center text-white text-3xl font-bold mb-4">
                            {displayParticipant?.avatar ? (
                                <img
                                    src={displayParticipant.avatar}
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                displayParticipant?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <p className="text-xl font-semibold">
                            {displayParticipant?.name || 'Participant'}
                        </p>
                        <p className="text-sm mt-1">
                            {remoteStream ? 'Connected' : 'Connecting...'}
                        </p>
                    </div>
                )}
            </div>
            
            {/* Control buttons */}
            <div className="flex justify-center space-x-8 p-4 bg-neutral-900 w-full">
                {/* Audio toggle button */}
                <button
                    onClick={handleToggleAudio}
                    className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-neutral-700'} text-white focus:outline-none hover:bg-opacity-80 transition-colors`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <FiMicOff className="text-2xl"/> : <FiMic className="text-2xl"/>}
                </button>                
                
                {/* Video toggle button - only show for video calls */}
                {callInfo.type === "video" && (
                    <button
                        onClick={handleToggleVideo}
                        className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-neutral-700'} text-white focus:outline-none hover:bg-opacity-80 transition-colors`}
                        title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    >
                        {isVideoOff ? <FiVideoOff className="text-2xl"/> : <FiVideo className="text-2xl"/>}
                    </button>
                )}
                
                {/* End call button */}
                <button
                    onClick={onEndCall}
                    className="p-3 rounded-full bg-red-500 text-white focus:outline-none hover:bg-red-600 transition-colors"
                    title="End Call"
                >
                    <FiPhoneOff className="text-2xl"/>
                </button>
            </div>
        </div>
    );
};

export default IncallUI;