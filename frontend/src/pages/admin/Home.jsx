
const Home = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-700">Total Users</h2>
                    <p className="text-3xl font-bold text-blue-600 mt-2">254</p>
                    <p className="text-sm text-gray-500 mt-2">+12% from last month</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-700">Active Sessions</h2>
                    <p className="text-3xl font-bold text-green-600 mt-2">45</p>
                    <p className="text-sm text-gray-500 mt-2">Currently online</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-700">Departments</h2>
                    <p className="text-3xl font-bold text-purple-600 mt-2">8</p>
                    <p className="text-sm text-gray-500 mt-2">Across organization</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-700">System Roles</h2>
                    <p className="text-3xl font-bold text-orange-600 mt-2">12</p>
                    <p className="text-sm text-gray-500 mt-2">With custom permissions</p>
                </div>
            </div>
            <div className="mt-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">System Overview</h2>
                    <p className="text-gray-600">
                        Welcome to the admin dashboard. Here you can manage users, roles, departments, and permissions.
                        Use the sidebar navigation to access different sections of the admin panel.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Home;
