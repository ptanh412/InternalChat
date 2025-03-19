import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import { AlertProvider } from './context/AlertMessage'
import "./styles/index.css"
import Home from './pages/admin/Home'
import Accounts from './components/admin/Accounts'
import AdminLayout from './components/layout/AdminLayout'
import Roles from './components/admin/Roles'
import Department from './components/admin/Department'
import { UserProvider } from './context/UserContext'
import { ThemeProvider } from './context/ThemeContext'
import EditAccount from './components/admin/EditAccount'
import Permissions from './components/admin/Permissions'
import Chat from './components/user/Chat'
import UserLayout from './components/layout/UserLayout'


const App = () => {

  const adminRoutes = [
    { path: '/admin-home', element: <Home /> },
    { path: '/accounts', element: <Accounts /> },
    {path: '/accounts/add-account', element: <EditAccount />},
    {path: '/accounts/edit-account/:id', element: <EditAccount />},
    { path: '/roles', element: <Roles /> },
    { path: '/departments', element: <Department /> },
    {path: '/permissions', element: <Permissions />}
  ];

  const userRoutes = [
    {path: '/chat', element: <Chat />}
  ]

  return (
    <UserProvider>
      <ThemeProvider>
        <AlertProvider>
          <Router>
            <Routes>
              <Route path='/login' element={<Login />} />
              {adminRoutes.map((route, index) => (
                <Route key={index} path={route.path} element={
                  <AdminLayout>
                    {route.element}
                  </AdminLayout>
                } />
              ))}
              {userRoutes.map((route, index) => (
                <Route key={index} path={route.path} element={
                  <UserLayout>
                    {route.element}
                  </UserLayout>
                } />
              ))}
              <Route path='/' element={<Home />} />
            </Routes>
          </Router>
        </AlertProvider>
      </ThemeProvider>
    </UserProvider>
  )
}

export default App;
