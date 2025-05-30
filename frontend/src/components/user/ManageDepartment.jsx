import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../context/UserContext';

const ManageDepartment = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const fetchDepartmentMembers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5000/api/department/${user.department._id}/members`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          setMembers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching department members:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.department?._id) {
      fetchDepartmentMembers();
    }
  }, [user]);

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMember(null);
  };

  const MemberDetailModal = () => {
    if (!selectedMember) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
          <div className="relative p-6">
            {/* Header with close button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Member Details</h2>
              <button
                onClick={closeModal}
                className="absolute right-5 top-5 p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <img
                  src={selectedMember.avatar}
                  alt={selectedMember.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-purple-500 shadow-lg"
                />
                <span className={`absolute bottom-0 right-3 h-5 w-5 rounded-full border-2 border-white ${selectedMember.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">{selectedMember.name}</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-2">
                {selectedMember.position}
              </span>
            </div>

            {/* Details grid */}
            <div className="space-y-5 bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem icon="👤" label="Employee ID" value={selectedMember.employeeId} />
                <DetailItem icon="📧" label="Email" value={selectedMember.email} />
                <DetailItem icon="📱" label="Phone" value={selectedMember.phoneNumber || "Not provided"} />
                <DetailItem icon="🏠" label="Address" value={selectedMember.address || "Not provided"} />
                <DetailItem
                  icon="⭐"
                  label="Status"
                  value={
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedMember.status === 'online'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                      {selectedMember.status}
                    </span>
                  }
                />
                <DetailItem
                  icon="🕒"
                  label="Last Active"
                  value={new Date(selectedMember.lastActive).toLocaleString()}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper component for detail items
  const DetailItem = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-lg">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto my-auto px-4 py-8 h-full">
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm rounded-xl overflow-hidden h-full">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900 dark:text-white shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="relative">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 w-3 h-8 rounded-full inline-block shadow-lg"></span>
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 w-3 h-8 rounded-full inline-block animate-pulse opacity-75"></span>
                </div>
              {user?.department?.name || 'Department'} Members
              </h1>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-purple-600  inline-block shadow-lg px-3 py-1 rounded-full text-white text-sm">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-200 border-opacity-50 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {members.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <div
                      key={member._id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex flex-col h-full">
                        {/* Card header with avatar */}
                        <div className="p-4 flex items-center space-x-4">
                          <div className="relative">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="h-16 w-16 rounded-full object-cover border-2 border-purple-200"
                            />
                            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{member.name}</h3>
                            <p className="text-sm text-purple-600 dark:text-purple-400">{member.position}</p>
                          </div>
                        </div>

                        {/* Card content */}
                        <div className="px-4 pb-4 flex-1">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{member.email}</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{member.phoneNumber || "No phone number"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <button
                            onClick={() => handleViewMember(member)}
                            className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-10 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-500 dark:bg-purple-900 dark:text-purple-300 mb-4">
                    <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No members found</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    There are no members in this department at the moment.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && <MemberDetailModal />}
    </div>
  );
};

export default ManageDepartment;