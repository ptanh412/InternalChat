import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useUser } from '../../context/UserContext';

const MessageReactions = ({ reactions, userReact }) => {
    console.log('User Reactions:', reactions, userReact);
    const [showAll, setShowAll] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const { user } = useUser();

    const reactionCounts = reactions.reduce((acc, reaction) => {
        const emoji = reaction.emoji;
        if (!acc[emoji]) {
            acc[emoji] = {
                count: 0,
                users: []
            }
        }
        acc[emoji].count += 1;

        const userId = typeof reaction.user === 'object' ? reaction.user._id : reaction.user;
        if (!acc[emoji].users.includes(userId)) {
            acc[emoji].users.push(userId);
        }
        return acc;
    }, {});

    const allUsers = Object.values(reactionCounts).reduce((acc, data) => {
        data.users.forEach(user => {
            if (!acc.includes(user)) {
                acc.push(user);
            }
        });
        return acc;
    }, []);

    const handleShowAll = () => {
        setShowAll(!showAll);
        setSelectedEmoji(null);
        setShowDetail(true);
    }

    const handleSelectEmoji = (emoji) => {
        setShowAll(false);
        setSelectedEmoji(emoji);
        setShowDetail(true);
    }

    const handleCloseDetail = () => {
        setShowDetail(false);
    };

    const filteredReactions = showAll ? reactions : reactions.filter(reaction => reaction.emoji === selectedEmoji);

    const filteredUsers = showAll ? allUsers : reactionCounts[selectedEmoji]?.users || [];
    console.log('Filtered Users:', filteredUsers);

    const totalReactions = reactions.length;

    return (
        <div className="relative">
            <div
                className={`absolute -bottom-6 ${userReact._id === user._id ? 'right-5' : 'left-5'} flex items-center justify-center space-x-1 text-gray-400 bg-neutral-700 rounded-full shadow-xl px-1`}
                onClick={handleShowAll}
            >
                {Object.entries(reactionCounts).map(([emoji, data]) => (
                    <span key={emoji} className="text-sm dark:text-white">
                        {emoji}
                    </span>

                )
                )}
                {totalReactions === 0 ? null : (
                    totalReactions
                )}
            </div>

            {showDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold dark:text-white">
                                Reactions to message
                            </h2>
                            <button onClick={handleCloseDetail} className="text-gray-500 hover:text-gray-300">
                                <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <button
                                onClick={handleShowAll}
                                className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${showAll ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                Total ({totalReactions})
                            </button>
                            {Object.entries(reactionCounts).map(([emoji, data]) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleSelectEmoji(emoji)}
                                    className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ml-2 ${!showAll && selectedEmoji === emoji
                                        ? 'bg-purple-700 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {emoji} ({data.count})
                                </button>
                            ))}
                        </div>

                        <ul className="space-y-2">
                            {filteredUsers.map(user => (
                                <li key={user.id} className="flex items-center space-x-3 dark:text-white">
                                    {user.avatar && (
                                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                                    )}
                                    {!user.avatar && (
                                        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                    <span>{user.name}</span>
                                    {!showAll && selectedEmoji && (
                                        <span>{selectedEmoji}</span>
                                    )}
                                    {showAll &&
                                        reactions
                                            .filter(r => r.user?.id === user.id)
                                            .map(r => (
                                                <span key={`${user.id}-${r.emoji}`}>{r.emoji}</span>
                                            ))}
                                </li>
                            ))}
                            {filteredUsers.length === 0 && (
                                <li className="dark:text-gray-400">Không có ai có cảm xúc này.</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );

}
export default MessageReactions;