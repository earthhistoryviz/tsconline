import { observer } from "mobx-react-lite";
import { Route, Routes } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { NavBar } from "./NavBar";
import { Home } from "./Home";
import { Settings } from "./Settings";
import { Chart } from "./Chart";
import { Datapack } from "./Datapack";
import { Help } from "./Help";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import { Alert, Slide, Snackbar, Typography } from "@mui/material";
import { useContext } from "react";
import { context } from "./state";
import { About } from "./About";
import { TSCError, Lottie } from "./components";
import ChartDoneIcon from "./assets/icons/chart-done.json";

export default observer(function App() {
  const { state, actions } = useContext(context);
  return (
    <ThemeProvider theme={theme}>
      <NavBar />
      <Toolbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chart" element={<Chart />} />
        <Route path="/datapack" element={<Datapack />} />
        <Route path="/help" element={<Help />} />
        <Route path="/about" element={<About />} />
      </Routes>
      {state.errorAlerts.map((error) => (
        <TSCError key={error.id} text={error.errorText} id={error.id} />
      ))}
      <TSCPopupDialog
        open={state.showSuggestedAgePopup}
        title="Suggested Age Span Flags detected"
        message="Do you want to use the Data-Pack's suggested age span?"
        onYes={() => actions.handlePopupResponse(true, navigate)}
        onNo={() => actions.handlePopupResponse(false, navigate)}
        onClose={() => actions.fetchChartFromServer(navigate)}
      />
      <Snackbar
        open={true}
        autoHideDuration={5000}
        TransitionComponent={Slide}
        onClose={actions.handleCloseSnackbar}
        style={{ alignItems: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          iconMapping={{
            success: (
              <Lottie
                animationData={ChartDoneIcon}
                autoplay
                loop
                width={200}
                height={200}
              />
            ),
          }}
          sx={{
            alignItems: "center", // Center align items
            ".MuiAlert-icon": {
              // Target the icon specifically if needed for finer control
              display: "flex",
              alignItems: "center",
            },
            ".MuiAlert-message": {
              // Ensure the text is also centered if necessary
              display: "flex",
              alignItems: "center",
              flexGrow: 1, // Make the message fill the available space to ensure proper centering
            },
            width: "100%",
            backgroundColor: theme.palette.on.dark,
          }}
        >
          <Typography style={{ textAlign: "center" }}>
            Chart Generated!
          </Typography>
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
});
