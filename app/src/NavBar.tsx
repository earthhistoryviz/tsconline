import { useContext } from 'react'
import { observer } from 'mobx-react-lite';
import AppBar from '@mui/material/AppBar' 
import { Link } from 'react-router-dom'
import Toolbar from '@mui/material/Toolbar'
import { useTheme } from '@mui/material/styles';

import TSCreatorLogo  from './assets/TSCreatorLogo.png'
import HomeIcon from '@mui/icons-material/Home';
import { IconButton, Tabs, Tab } from '@mui/material'
import { primary_light, secondary } from './constant';
import { context } from './state';
import { TSCTabs, TSCTab } from './assets'

import "./NavBar.css"

export const NavBar = observer(function Navbar() {
  const theme = useTheme()
  const { state, actions } = useContext(context);
  return (
    <AppBar position="fixed" sx={{background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
        <Link to="/">
          <IconButton 
            size="large"
            sx={{
              color: theme.palette.selection.main,
              "&:hover": {
                color: theme.palette.selection.light,
                opacity: 1,
              },
            }}
            value={0}
            onClick={() => {
              actions.setTab(0)
              actions.setUseCache(true)
            }}
          >
          <HomeIcon /> 
          </IconButton> 
        </Link>
        { state.showAllTabs && (
          <TSCTabs 
              value={state.tab !== 0 ? state.tab : false} 
              onChange={(_e, value) =>  {
                actions.setTab(value)
              }} 
              sx={{
                '& .MuiTab-root': {  
                  color: theme.palette.primary.main,
                  '&:hover': {
                    color: theme.palette.selection.light, 
                    backgroundColor: 'hoverColor'
                  },
                },
                '& .Mui-selected': { 
                  color: theme.palette.selection.main,
                }
              }}
              // indicatorColor="secondary"
            >
              <Tab value={1} label="Chart" to="/chart" component={Link}/>
              <Tab value={2} label="Settings" to="/settings" component={Link} />
              <Tab value={3} label="Datapack" to="/datapack" component={Link} />
              <Tab value={4} label="Help" to="/help" component={Link} />
            </TSCTabs>
        )}
        <div style={{ flexGrow: 3 }} />
        <div style={{ flexGrow: 2 }} />
        <img src={TSCreatorLogo} width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});

