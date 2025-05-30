import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
// import { AlertProvider } from './context/AlertContext'
import "./styles/index.css"
import Home from './pages/admin/Home'
import Accounts from './components/admin/Accounts'
import AdminLayout from './components/layout/AdminLayout'
import Roles from './components/admin/Roles'
import Department from './components/admin/Department'
import { UserProvider, useUser } from './context/UserContext'
import { ThemeProvider } from './context/ThemeContext'
import EditAccount from './components/admin/EditAccount'
import Permissions from './components/admin/Permissions'
import Chat from './components/user/Chat'
import UserLayout from './components/layout/UserLayout'
import { ChatContextProvider } from './context/ChatContext'
import Conversation from './components/admin/Conversation'
import ConversationDetail from './components/admin/ConversationDetail'
import Employee from './components/admin/Employee'
import EditEmployee from './components/admin/EditEmployee'
import { AlertProvider } from './context/AlertContext'
import ResetPassword from './pages/user/ResetPassword'
import ForgotPassword from './pages/user/ForgotPassword'
import ForgotPasswordConfirmation from './pages/user/ForgotPasswordConfirmation'
import { NotificationProvider } from './context/NotificationContext'
import ManageMember from './components/user/ManageDepartment'
import { DeactivationDialog, DialogProvider } from './context/DialogContext '


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) {
    return <div className='flex justify-center items-center h-screen w-full'>
      <div className="loader"></div>
    </div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children;
}

const App = () => {

  const adminRoutes = [
    { path: '/admin-home', element: <Home /> },
    { path: '/accounts', element: <Accounts /> },
    { path: '/accounts/add-account', element: <EditAccount /> },
    { path: '/accounts/edit-account/:id', element: <EditAccount /> },
    { path: '/employees', element: <Employee /> },
    { path: '/accounts/add-employee', element: <EditEmployee /> },
    { path: '/accounts/edit-employee/:id', element: <EditEmployee /> },
    { path: '/roles', element: <Roles /> },
    { path: '/departments', element: <Department /> },
    { path: '/permissions', element: <Permissions /> },
    { path: '/conversation', element: <Conversation /> },
    { path: '/conversation/department/:id', element: <ConversationDetail /> },

  ];

  const userRoutes = [
    { path: '/chat', element: <Chat /> },
    { path: 'manage-department', element: <ManageMember /> }
  ]

  return (
    <Router>
      <AlertProvider>
        <DialogProvider>
          <UserProvider>
            <ThemeProvider>
              <NotificationProvider>
                <Routes>
                  <Route path='/' element={<Navigate to="/login" replace />} />
                  <Route path='/login' element={<Login />} />
                  <Route path='/forgot-password' element={<ForgotPassword />} />
                  <Route path='/forgot-password-confirmation' element={<ForgotPasswordConfirmation />} />
                  <Route path='/reset-password' element={<ResetPassword />} />
                  {adminRoutes.map((route, index) => (
                    <Route key={index} path={route.path} element={
                      <ProtectedRoute>
                        <AdminLayout>
                          {route.element}
                        </AdminLayout>
                      </ProtectedRoute>
                    } />
                  ))}
                  {userRoutes.map((route, index) => (
                    <Route key={index} path={route.path} element={
                      <ProtectedRoute>
                        <ChatContextProvider>
                          <UserLayout>
                            {route.element}
                          </UserLayout>
                        </ChatContextProvider>
                      </ProtectedRoute>
                    } />
                  ))}
                  <Route path='/' element={<Home />} />
                </Routes>
                <DeactivationDialog/>
              </NotificationProvider>
            </ThemeProvider>
          </UserProvider>
        </DialogProvider>
      </AlertProvider>
    </Router>
  );
}

export default App;
