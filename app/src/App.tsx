import { observer } from "mobx-react-lite";
import { Route, Routes, useNavigate } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { NavBar } from "./NavBar";
import { Home } from "./Home";
import { Settings } from "./Settings";
import { Chart } from "./Chart";
import { Help } from "./Help";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import theme from "./theme";
import { useContext } from "react";
import { context } from "./state";
import { About } from "./About";
import { Login } from "./Login";
import { SignUp } from "./SignUp";
import { AccountRecovery } from "./AccountRecovery";
import { TSCPopupDialog, TSCError, TSCSnackbar } from "./components";
import { CssBaseline } from "@mui/material";

export default observer(function App() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  actions.sessionCheck();
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NavBar />
        <Toolbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/account-recovery" element={<AccountRecovery />} />
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
