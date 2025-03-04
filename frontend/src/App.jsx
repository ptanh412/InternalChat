import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Login from './pages/Login'
import { AlertProvider } from './context/AlertMessage'
import "./styles/index.css"


const App = () => {
  const [count, setCount] = useState(0)

  return (
    <AlertProvider>
      <Router>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/' element={
            <>
              <div>
                HI 
                {/* <a href="https://vite.dev" target="_blank">
                  <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                  <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
              </div>
              <h1>Vite + React</h1>
              <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                  count is {count}
                </button>
                <p>
                  Edit <code>src/App.jsx</code> and save to test HMR
                </p>
              </div>
              <p className="read-the-docs">
                Click on the Vite and React logos to learn more
              </p> */}
              </div>
            </>
          } />
        </Routes>
      </Router>
    </AlertProvider>
  )
}

export default App
