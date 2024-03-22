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
import { Alert, Slide, Snackbar, Typography } from "@mui/material";
import { useContext } from "react";
import { context } from "./state";
import { About } from "./About";
import { TSCPopupDialog, TSCError, Lottie } from "./components";
import ChartDoneIcon from "./assets/icons/chart-done.json";
import "./App.css";

export default observer(function App() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <NavBar />
        <Toolbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
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
        <Snackbar
          open={state.openSnackbar}
          autoHideDuration={5000}
          TransitionComponent={Slide}
          onClose={actions.handleCloseSnackbar}>
          <Alert
            severity="success"
            variant="filled"
            className="success-alert"
            iconMapping={{
              success: <Lottie animationData={ChartDoneIcon} speed={0.7} autoplay />
            }}>
            <Typography>Chart Successfully Generated!</Typography>
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </StyledEngineProvider>
  );
});
