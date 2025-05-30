import { useEffect, useRef, useState } from "react";
import { FiMic, FiMicOff, FiPhoneOff, FiVideo, FiVideoOff } from "react-icons/fi";

const IncallUI = ({ callInfo, localStream, remoteStream, onEndCall, onToggleAudio, onToggleVideo }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);


    const handleToggleAudio = () => {
        onToggleAudio();
        setIsMuted(prev => !prev);
    };

    const handleToggleVideo = () => {
        onToggleVideo();
        setIsVideoOff(prev => !prev);
    }

    if (!callInfo) return null;

    return (
        <div className="absolute inset-0 bg-black dark:bg-neutral-900 z-30 flex flex-col items-center justify-center text-white">
            <div className="relative flex-grow w-full flex items-center justify-center bg-neutral-800 dark:bg-black overflow-hidden">
                {callInfo.type === "video" && remoteStream && (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover absolute inset-0"
                    />
                )}
                {callInfo.type === "video" && localStream && (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute bottom-4 right-4 w-32 h-24 rounded-lg shadow-lg border-2 border-blue-500 object-cover z-10" // Video nhỏ góc màn hình
                    />
                )}
                {(callInfo.type === "voice" || !remoteStream) && (
                    <div className="flex flex-col items-center text-stone-400">
                        <div className="w-32 h-32 rounded-full bg-neutral-700 flex items-center justify-center text-white text-3xl font-bold mb-4">
                            {callInfo.otherParticipant?.avatar ? (
                                <img
                                    src={callInfo.otherParticipant?.avatar}
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                callInfo.otherParticipant?.name?.charAt(0).toUpperCase() 
                            )}
                        </div>
                        <p className="text-xl font-semibold">
                            {callInfo.otherParticipant?.name || 'Participant'}
                        </p>
                        <p className="text-sm mt-1">
                            Connecting...
                        </p>
                    </div>
                )}
            </div>
            <div className="flex justify-center space-x-8 p-4 bg-neutral-900 w-full">
                <button
                    onClick={handleToggleVideo}
                    className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-neutral-700'} text-white focus:outline-none`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <FiMicOff className="text-2xl"/> : <FiMic className="text-2xl"/>}
                </button>
                {callInfo.type === "video" && (
                    <button
                        onClick={handleToggleAudio}
                        className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-neutral-700'} text-white focus:outline-none`}
                        title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    >
                        {isVideoOff ? <FiVideoOff className="text-2xl"/> : <FiVideo className="text-2xl"/>}
                    </button>
                )}
                <button
                    onClick={onEndCall}
                    className="p-3 rounded-full bg-red-500 text-white focus:outline-none"
                    title="End Call"
                >
                    <FiPhoneOff className="text-2xl"/>
                </button>
            </div>
        </div>
    )
}
export default IncallUI;