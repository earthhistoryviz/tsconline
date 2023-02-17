import { observer } from 'mobx-react-lite';
//import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppBar from '@mui/material/AppBar' 
import Toolbar from '@mui/material/Toolbar'
import { Container } from 'react-bootstrap'
import Navbar from './components/Navbar'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Chart} from './pages/Chart'

export default observer(function App() {

  return (
    <>
        <Navbar />
        <Toolbar></Toolbar>
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/chart" element={<Chart/>} />
        </Routes>
    </>
  )
});
