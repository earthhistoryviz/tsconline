import { observer } from "mobx-react-lite";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { NavBar } from "./NavBar";
import { Home } from "./Home";
import { Settings } from "./Settings";
import { Chart } from "./Chart";
import { Help } from "./Help";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { darkTheme, lightTheme, originalDarkTheme, originalTheme } from "./theme";
import { useContext, useEffect } from "react";
import { context } from "./state";
import { About } from "./About";
import { Login } from "./Login";
import { SignUp } from "./SignUp";
import { ForgotPassword } from "./ForgotPassword";
import { AccountVerify } from "./AccountVerify";
import { AccountRecovery } from "./AccountRecovery";
import { TSCPopupDialog, TSCError, TSCSnackbar } from "./components";
import { CssBaseline } from "@mui/material";
import { Profile } from "./Profile";
import "./App.css";
import { DatapackProfile } from "./DatapackProfile";

export default observer(function App() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = state.user.settings.darkMode ? originalDarkTheme : originalTheme;
  // const theme = state.user.settings.darkMode ? darkTheme : lightTheme
  useEffect(() => {
    const backgroundColor = theme.palette.backgroundColor.main;
    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
  }, [theme]);
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {location.pathname != "/verify" && <NavBar />}
        <Toolbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify" element={<AccountVerify />} />
          <Route path="/account-recovery" element={<AccountRecovery />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/datapack/:id" element={<DatapackProfile />} />
        </Routes>
        {Array.from(state.errors.errorAlerts.entries()).map(([context, error], index) => (
          <TSCError
            key={context}
            errorContext={context}
            message={error.errorText}
            index={index}
            count={error.errorCount}
          />
        ))}
        <TSCPopupDialog
          open={state.showSuggestedAgePopup}
          title="Use default age range?"
          onYes={() => actions.handlePopupResponse(true, navigate)}
          onNo={() => actions.handlePopupResponse(false, navigate)}
          onClose={() => actions.fetchChartFromServer(navigate)}
        />
        {state.snackbars.map((info, index) => (
          <TSCSnackbar
            key={info.snackbarText}
            text={info.snackbarText}
            count={info.snackbarCount}
            index={index}
            severity={info.severity}
          />
        ))}
      </ThemeProvider>
    </StyledEngineProvider>
  );
});
