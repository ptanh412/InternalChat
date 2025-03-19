import ConversationList from "./ConversationList";
import Groups from "./Groups";
import Contacts from "./Contacts";
import Profile from "./Profile";

const Chat = ({ currentComponent }) => {
    let ComponentToRender;

    switch (currentComponent) {
        case 'Groups':
            ComponentToRender = Groups;
            break;
        case 'Contacts':
            ComponentToRender = Contacts;
            break;
        case 'Profile':
            ComponentToRender = Profile;
            break;
        default:
            ComponentToRender = ConversationList;
    }
    return (
        <div className="flex h-full w-full dark:text-white">
            <div className="bg-neutral-900 flex-1">
                <ComponentToRender />
            </div>
            <div className="bg-neutral-800 flex-[2] flex justify-center items-center">
                <div className="w-full h-full flex flex-col bg-neutral-800 text-white">
                    {/* Header */}
                    <div className="flex items-center p-4 border-b border-gray-700">
                        <img
                            src="https://randomuser.me/api/portraits/women/44.jpg"
                            alt="User"
                            className="w-10 h-10 rounded-full"
                        />
                        <div className="ml-3">
                            <h2 className="text-lg font-semibold">Doris Brown</h2>
                            <p className="text-sm text-green-400">Active</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="mb-4">
                            <div className="bg-purple-600 text-white rounded-lg p-3 w-2/3">Images</div>
                        </div>
                        <div className="mb-4 flex justify-end">
                            <div className="bg-gray-700 text-white rounded-lg p-3 w-2/3">
                                <p>admin_v1.0.zip</p>
                                <span className="text-xs text-gray-400">12.5 MB</span>
                            </div>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-gray-700 flex items-center">
                        <input
                            type="text"
                            placeholder="Enter message..."
                            className="flex-1 p-2 rounded-lg bg-gray-800 text-white"
                        />
                        <button className="ml-2 p-2 bg-blue-500 rounded-lg">Send</button>
                    </div>
                </div>
            </div>
            <div className="bg-neutral-800 flex-1 flex justify-center items-center">
                <div className="w-full h-full bg-neutral-700 text-white p-4">
                    <h2 className="text-xl font-bold">Profile</h2>
                    <div className="flex flex-col items-center mt-4">
                        <img
                            src="https://randomuser.me/api/portraits/women/44.jpg"
                            alt="Profile"
                            className="w-16 h-16 rounded-full"
                        />
                        <h3 className="text-lg font-semibold mt-2">Doris Brown</h3>
                        <p className="text-green-400">Active</p>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold">About</h3>
                        <p className="text-sm text-gray-400 mt-2">
                            "If several languages coalesce, the grammar of the resulting language is simpler."
                        </p>
                        <div className="mt-4 text-sm">
                            <p><strong>Name:</strong> Doris Brown</p>
                            <p><strong>Location:</strong> California, USA</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
