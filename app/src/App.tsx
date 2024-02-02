import { observer } from 'mobx-react-lite';
import { Route, Routes } from 'react-router-dom'
import Toolbar from '@mui/material/Toolbar'
import { NavBar }from './NavBar'
import { Home } from './Home'
import { Settings } from './Settings'
import { Chart} from './Chart'
import { Datapack } from './Datapack'
import { Help } from './Help';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme'
import { Alert, Slide, Snackbar } from '@mui/material';
import { useContext } from 'react';
import { context } from './state';
import {About} from "./About";

export default observer(function App() {
  const { state, actions } = useContext(context)
  return (
    <ThemeProvider theme={theme}>
      <NavBar />
      <Toolbar />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/settings" element={<Settings/>} />
        <Route path="/chart" element={<Chart/>} />
        <Route path="/datapack" element={<Datapack/>} />
        <Route path="/help" element={<Help/>} />
        <Route path="/about" element={<About/>} />
      </Routes>
      <Snackbar
      open={state.openSnackbar}
      autoHideDuration={5000}
      TransitionComponent={Slide}
      onClose={actions.handleCloseSnackbar}
      >
      <Alert
        // onClose={actions.handleCloseSnackbar}
        severity="success"
        variant="filled"
        sx={{ width: '100%', backgroundColor: theme.palette.on.dark }}
      >
        Chart Generated!
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
});
