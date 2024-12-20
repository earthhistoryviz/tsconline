import { observer } from "mobx-react-lite";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { NavBar } from "./NavBar";
import { Home } from "./Home";
import { Settings } from "./Settings";
import { Chart } from "./Chart";
import { Help } from "./Help";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { originalDarkTheme, originalLightTheme } from "./theme";
import { useContext, useEffect } from "react";
import { context } from "./state";
import { About } from "./About";
import { Login } from "./Login";
import { SignUp } from "./SignUp";
import { Datapacks } from "./settings_tabs/Datapack";
import { ForgotPassword } from "./ForgotPassword";
import { AccountVerify } from "./AccountVerify";
import { AccountRecovery } from "./AccountRecovery";
import { TSCYesNoPopup, TSCError, TSCSnackbar } from "./components";
import { CssBaseline } from "@mui/material";
import "./App.css";
import { DatapackProfile } from "./DatapackProfile";
import { Profile } from "./account_settings/Profile";
import { Admin } from "./admin/Admin";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { toJS } from "mobx";
import { useTranslation } from "react-i18next";
import { TSCDialogLoader } from "./components/TSCDialogLoader";
import { Workshops } from "./Workshops";
import WorkshopDetails from "./WorkshopDetails";

export default observer(function App() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = state.user.settings.darkMode ? originalDarkTheme : originalLightTheme;
  const backgroundColor = theme.palette.backgroundColor.main;
  document.documentElement.style.backgroundColor = backgroundColor;
  document.body.style.backgroundColor = backgroundColor;
  // listen for changes in preferred color scheme
  useEffect(() => {
    const cleanup = actions.listenForSystemDarkMode();
    return () => {
      cleanup();
    };
  }, []);

  // on theme change, update the background color
  const checkUnsavedChanges = () => {
    const isOnDatapacksTab = location.pathname === "/settings" && state.settingsTabs.selected === "datapacks";
    const isOnDatapackPath = location.pathname === "/datapacks";
    const hasUnsavedChanges = JSON.stringify(state.config.datapacks) !== JSON.stringify(state.unsavedDatapackConfig);
    if (state.isProcessingDatapacks) {
      return false;
    }
    if (hasUnsavedChanges && !(isOnDatapackPath || isOnDatapacksTab)) {
      return true;
    }
    return false;
  };
  return (
    <StyledEngineProvider injectFirst>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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
            <Route path="/admin" element={<Admin />} />
            <Route path="/datapacks" element={<Datapacks />} />
            <Route path="/workshops" element={<Workshops />} />
            <Route path="/workshops/:id" element={<WorkshopDetails />} />
          </Routes>
          {Array.from(state.errors.errorAlerts.entries())
            .reverse()
            .map(([context, error], index) => (
              <TSCError
                key={context}
                errorContext={context}
                message={error.errorText}
                index={index}
                count={error.errorCount}
              />
            ))}
          <TSCYesNoPopup
            open={state.showSuggestedAgePopup}
            title={t("dialogs.default-age.title")}
            onYes={() => actions.handlePopupResponse(true, navigate)}
            onNo={() => actions.handlePopupResponse(false, navigate)}
            onClose={() => actions.fetchChartFromServer(navigate)}
          />
          <TSCDialogLoader
            open={state.isProcessingDatapacks}
            headerText={t("loading.loading-datapacks")}
            subHeaderText={t("loading.time")}
          />
          <TSCYesNoPopup
            open={checkUnsavedChanges()}
            title={t("dialogs.confirm-datapack-change.title")}
            message={t("dialogs.confirm-datapack-change.message")}
            onNo={async () => {
              actions.setUnsavedDatapackConfig(state.config.datapacks);
            }}
            onYes={async () => {
              await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
            }}
            onClose={async () => {
              actions.setUnsavedDatapackConfig(state.config.datapacks);
            }}
            customNo={t("dialogs.confirm-datapack-change.no")}
            customYes={t("dialogs.confirm-datapack-change.yes")}
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
      </LocalizationProvider>
    </StyledEngineProvider>
  );
});
