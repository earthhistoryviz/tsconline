import { useState } from 'react'
//import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppBar from '@mui/material/AppBar' 
import { Container } from 'react-bootstrap'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Chart} from './pages/Chart'

function App() {
  const [count, setCount] = useState(0)


  return (
    <>
        <Navbar />
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/chart" element={<Chart/>} />
        </Routes>
    </>
  )
}

export default App
