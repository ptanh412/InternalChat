import { FaUber } from "react-icons/fa";
import { useState } from "react";
import { useUser } from "../../context/UserContext";

const Profile = () => {
    const [isOpened, setIsOpened] = useState(true);
    const {user} = useUser ();
    return (
        <div className="w-full h-full dark:bg-neutral-900 dark:text-white p-4">
            <h2 className="text-xl font-bold">Profile</h2>
            <div className="flex flex-col items-center mt-4">
                <img
                    src={user.avatar}
                    alt="Profile"
                    className="w-16 h-16 rounded-full"
                />
                <h3 className="text-lg font-semibold mt-2">{user.name}</h3>
                <p className="text-green-400">{user.status === 'online' ? 'Active': 'Offline'}</p>
            </div>

            <div className="p-4 mt-4 dark:bg-neutral-800 rounded-lg">
                <h3 className="text-lg font-semibold">About</h3>
                <p className="text-sm text-gray-400 mt-2">
                    "If several languages coalesce, the grammar of the resulting language is simpler."
                </p>
                <div className="mt-4 dark:bg-neutral-800 rounded-lg">
                    <button
                        onClick={() => setIsOpened(!isOpened)}
                        className="w-full text-base font-semibold dark:bg-neutral-800 p-2 rounded-lg flex justify-between"
                    >
                        <div className="flex items-center">
                            <FaUber className="mr-2" />
                            <span>Details</span>
                        </div>
                        <span>{isOpened ? "▲" : "▼"}</span>
                    </button>

                    {isOpened && (
                        <div className="mt-4 space-y-10 text-sm dark:bg-neutral-700 p-5 rounded-lg">
                            <p><strong>Name:</strong> {user.name}</p>
                            <p><strong>Email:</strong> <span className="text-blue-400"> {user.email}</span></p>
                            <p><strong>Position:</strong> {user.position}</p>
                            <p><strong>Departmant:</strong> {user.department.name}</p>
                            <p><strong>Time:</strong> 11:40 AM</p>
                            <p><strong>Location:</strong> California, USA</p>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile; 