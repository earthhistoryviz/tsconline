import { useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import AppBar from '@mui/material/AppBar'
import * as React from 'react'
//import { CssVarsProvider } from '@mui/joy/styles';
//import Button from '@mui/joy/Button';
import Container from '@mui/material/Container'
import { NavLink } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Toolbar from '@mui/material/Toolbar'
import { CssVarsProvider } from '@mui/joy/styles'

import  TSCreatorLogo  from '../assets/TSCreatorLogo.png'
//import TSCreatorLogo from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton, Typography, Stack, Button, Tabs, Tab } from '@mui/material'
import "./navbar.css"
  

//bg-white shadow-sm mb-3
//</TSCreatorLogo /> 
//<Tab value={0} label="Home" to="/" component={Link} />


export default observer(function Navbar() {

    const { state, actions } = useContext(context);

    return (
        <AppBar position="fixed" sx={{background: "#000000", display: "flex" }}>
            <Toolbar>
                <IconButton 
                  href="/"
                  size="large"
                  color="inherit"
                  value={0}
                  onClick={() => actions.setTab(0)} 
                  >
                    <HomeIcon /> 
                </IconButton> 
                { (state.tab === 0) 
                ? 
                  <div onClick={() => actions.setTab(1)}>There are no tabs</div> 
                : 
                  <Tabs 
                  textColor="inherit" 
                  value={state.tab} 
                  onChange={(e, value) => actions.setTab(value)} 
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
                }
                <div style={{flexGrow: 2}}></div>
                <img src={TSCreatorLogo} width="50px" height="50px"></img>
            </Toolbar>
        </AppBar>
    )   
});

