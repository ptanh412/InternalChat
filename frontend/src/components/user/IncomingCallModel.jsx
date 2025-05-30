import { FiPhone, FiVideo } from 'react-icons/fi';

const ImcomingCallModel = ({ callInfo, onAnswer, onDecline }) => {
    if (!callInfo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-ne-800 rounded-lg shadow-xl p-6 text-center">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">
                    Incoming {callInfo.type} Call
                </h2>

                <div className="mb-6">
                    {callInfo.initiator?.avatar ? (
                        <img
                            src={callInfo.initiator?.avatar}
                            alt="User Avatar"
                            className="w-20 h-20 rounded-full mx-auto mb-2"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full mx-auto mb-2 bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                            {callInfo.initiator?.name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <p className="text-lg font-semibold dark:text-white">
                        {callInfo.initiator?.name || 'Unknown User'}
                    </p>
                    <p className="text-lg font-semibold dark:text-neutral-400 ">
                        on {callInfo.conversationName || 'this chat'}
                    </p>
                </div>
                <div className="flex justify-center space-x-6">
                    <button
                        onClick={onAnswer}
                        className="flex flex-col items-center text-green-500 hover:text-green-600 transition-colors focus:outline-none"
                    >
                        <FiPhone className="text-4xl" />
                        <span className='text-sm mt-1 dark:text-green-400'>
                            Answer
                        </span>
                    </button>
                     <button
                        onClick={onDecline}
                        className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors focus:outline-none"
                        title="Decline"
                    >
                        <FiPhone className="text-4xl" />
                        <span className="text-sm mt-1 dark:text-red-400">Decline</span>
                    </button>
                </div>
            </div>

        </div>
    )
};

export default ImcomingCallModel;