import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import * as React from 'react'
//import { CssVarsProvider } from '@mui/joy/styles';
//import Button from '@mui/joy/Button';
import Container from '@mui/material/Container'
import { NavLink } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Toolbar from '@mui/material/Toolbar'
import { CssVarsProvider } from '@mui/joy/styles'

import  TSCreatorLogo  from './TSCreatorLogo.png'
import imgUrl from './TSCreatorLogo.png'
//import TSCreatorLogo from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton, Typography, Stack, Button, Tabs, Tab } from '@mui/material'
import "./navbar.css"
  

//bg-white shadow-sm mb-3
//</TSCreatorLogo /> 
//<Tab value={0} label="Home" to="/" component={Link} />


export function Navbar() {
const [value, setValue] = useState(0);

  
    return (
        <div className='navbar'>
            <AppBar position="fixed" sx={{background: "#000000" }}>
                <Toolbar>
                    <IconButton size="large"
                      color="inherit"
                      value={0}
                      onClick={() => setValue(0)} 
                      >
                        <HomeIcon /> 
                    </IconButton> 
                    <Tabs 
                    textColor="inherit" 
                    value={value} 
                    onChange={(e, value) => setValue(value)} 
                    indicatorColor="secondary"
                    TabIndicatorProps={{
                        style: {
                            backgroundColor: "#a1e7a1"
                        }
                    }}
                    >
                        <Tab value={1} label="Settings" to="/settings" component={Link} />
                        <Tab value={2} label="Chart" to="/chart" component={Link}/>
                    </Tabs>
                    <img src={imgUrl} width="50px" height="50px"></img>
                </Toolbar>
            </AppBar>
        </div>
    )   
}

                /*<IconButton>
                </IconButton>
                <Typography variant="h6" component="div" sx={{flexGrow: 1}}>Home</Typography>
                <Stack direction="row" spacing={2}>
                    <Button color="inherit">
                    Home
                    <Link to="/"></Link>
                    </Button>
                    <Button color="inherit">Settings</Button>
                    <Link to="/settings"></Link>
                    <Button color="inherit">Chart</Button>
                    <Link to="/chart"></Link>
                </Stack>*/

                /*<Link to="/">Home</Link>
                <Link to="/settings">Settings</Link>
                <Link to="/chart">Chart</Link>*/
export default Navbar; 
