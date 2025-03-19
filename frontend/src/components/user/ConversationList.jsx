import { CiSearch } from "react-icons/ci";
import { useState } from "react";
const ConversationList = () => {
    const conversations = [
        { id: 1, name: "Steve Walker", lastMessage: "Admin-A-zip", time: "01:16 PM" },
        { id: 2, name: "Albert Rodarte", lastMessage: "typing ••", time: "01:05 PM" },
        { id: 3, name: "Mirta George", lastMessage: "Yeah, Everything is fine 👍", time: "02:50 min" },
        { id: 4, name: "Paul Haynes", lastMessage: "Good Morning 😆", time: "02:50 min" }
    ];
    const [status, setStatus] = useState("online");
    return (
        <div className="p-4 w-full z-0">
            <h1 className="text-2xl">Chats</h1>
            <div className="mt-5 flex items-center">
                <div className="absolute flex items-center dark:text-white hover:text-gray-500 ml-2">
                    <CiSearch className="text-gray-400 text-3xl hover:bg-neutral-600 p-1 rounded-full" />
                </div>
                <input
                    type="text"
                    className="pl-10 pr-4 py-2 rounded-3xl w-full border border-gray-300 dark:border-neutral-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 dark:bg-neutral-700 dark:text-white"
                    placeholder="Search..."
                />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-5">
                {conversations.slice(0, 4).map((chat) => (
                    <div
                        key={chat.id}
                        className="relative cursor-pointer"
                        onClick={() => onSelectConversation(chat.id)}
                    >
                        {/* Background đen phía sau */}
                        <div className="absolute bottom-0 w-full h-3/4 bg-neutral-800 rounded-lg"></div>

                        {/* Phần nội dung */}
                        <div className="relative flex flex-col items-center">
                            <img
                                src="https://randomuser.me/api/portraits/women/44.jpg"
                                alt={chat.name}
                                className="w-8 h-8 rounded-full z-10"
                            />
                            {status === "online" ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 top-6 right-5 z-20"></div>
                            ) : (
                                <div className="w-3 h-3 bg-gray-500 rounded-full absolute bottom-0 right-0 z-20"></div>
                            )}
                            <div className="font-semibold text-sm text-center text-white mt-1 z-10">{chat.name}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <h1 className="font-semibold">Recent</h1>
                {conversations.map((chat) => (
                    <div
                        key={chat.id}
                        className="p-3 rounded-lg hover:bg-neutral-800 cursor-pointer mb-4"
                        onClick={() => onSelectConversation(chat.id)}
                    >
                        <div className="flex items-center w-full justify-between">
                            <div className="relative mr-3">
                                <img
                                    src="https://randomuser.me/api/portraits/women/44.jpg"
                                    className="w-10 h-10 rounded-full"
                                />
                                {status === "online" ? (
                                    <div className="w-3 h-3 bg-green-500 rounded-full absolute bottom-0 right-0"></div>
                                ) : (
                                    <div className="w-3 h-3 bg-gray-500 rounded-full absolute bottom-0 right-0"></div>
                                )}
                            </div>
                            <div className="w-[190px]">
                                <div className="font-semibold">{chat.name}</div>
                                <div className="text-sm text-gray-400">{chat.lastMessage}</div>
                            </div>
                            <div className="text-xs text-gray-500 text-right">{chat.time}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};

export default ConversationList;