import { Users, Activity, Briefcase, Shield, Bell, TrendingUp, Calendar, MessageSquare } from "lucide-react";

const Home = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header with improved styling */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, Admin</p>
        </div>
      </div>

      {/* Stats Cards - Enhanced with icons and better styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700 overflow-hidden group">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</h2>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">254</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                <Users size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 py-0.5 px-2 rounded-full">
                +12%
              </span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">From last month</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700 overflow-hidden group">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Sessions</h2>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">45</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
                <Activity size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">Currently online</span>
              <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-green-400 to-green-600"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700 overflow-hidden group">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Departments</h2>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">8</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">Across organization</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-purple-400 to-purple-600"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700 overflow-hidden group">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">System Roles</h2>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">12</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                <Shield size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">With custom permissions</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600"></div>
        </div>
      </div>

      {/* Extended section - Activity and Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* System Overview with improved styling */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
              <TrendingUp size={18} className="mr-2 text-blue-500" />
              System Overview
            </h2>
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Details</button>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Welcome to the admin dashboard. Here you can manage users, roles, departments, and permissions.
            Use the sidebar navigation to access different sections of the admin panel.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex items-center">
              <div className="p-2 bg-blue-500/10 rounded-lg mr-4">
                <Users size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">User Management</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add, edit, or remove users</p>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex items-center">
              <div className="p-2 bg-green-500/10 rounded-lg mr-4">
                <Shield size={20} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Role Assignment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage user permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
              <Calendar size={18} className="mr-2 text-purple-500" />
              Recent Activity
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="border-l-2 border-blue-500 pl-4 py-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">User login</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">John Doe just signed in</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">5 minutes ago</p>
            </div>
            
            <div className="border-l-2 border-green-500 pl-4 py-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">New department</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Marketing department created</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">2 hours ago</p>
            </div>
            
            <div className="border-l-2 border-orange-500 pl-4 py-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Permission update</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin role permissions updated</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Yesterday</p>
            </div>
          </div>
          
          <button className="w-full mt-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            View All Activity
          </button>
        </div>
      </div>

      {/* Footer */}
      {/* <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
        Admin Dashboard © 2025 • All rights reserved
      </div> */}
    </div>
  );
};

export default Home;