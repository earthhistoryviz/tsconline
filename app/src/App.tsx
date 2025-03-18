import { observer } from "mobx-react-lite";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { NavBar } from "./NavBar";
import { Home } from "./Home";
import { Settings } from "./Settings";
import { Help } from "./Help";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { ddeDarkTheme, ddeLightTheme, originalDarkTheme, originalLightTheme } from "./theme";
import { useContext, useEffect, useState } from "react";
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
import { Presets } from "./Presets";
import { Workshops } from "./Workshops";
import WorkshopDetails from "./WorkshopDetails";
import Joyride, { CallBackProps, ACTIONS, ORIGIN, EVENTS } from "react-joyride";
import { enDpTour, zhDpTour, enQsg, zhQsg, enSetTour, zhSetTour } from "./tours";
import { FileFormatInfo } from "./FileFormatInfo";
import i18n from "../i18n";
import { CrossPlotChart } from "./crossplot/CrossPlotChart";
import { isDDEServer } from "./constants";
import { ChartTab } from "./Chart";

export default observer(function App() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const darkTheme = isDDEServer ? ddeDarkTheme : originalDarkTheme;
  const lightTheme = isDDEServer ? ddeLightTheme : originalLightTheme;
  const theme = state.user.settings.darkMode ? darkTheme : lightTheme;
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
  const getQsg = () => {
    switch (i18n.language) {
      case "en":
        return enQsg;
      case "zh":
        return zhQsg;
      default:
        return enQsg;
    }
  };
  const getDatapackTour = () => {
    switch (i18n.language) {
      case "en":
        return enDpTour;
      case "zh":
        return zhDpTour;
      default:
        return enDpTour;
    }
  };
  const getSettingsTour = () => {
    switch (i18n.language) {
      case "en":
        return enSetTour;
      case "zh":
        return zhSetTour;
      default:
        return enSetTour;
    }
  };
  const handleQSGCallback = (data: CallBackProps) => {
    const { status, action, origin, index, type } = data;
    const finishedStatuses: string[] = ["finished", "skipped"];
    if (finishedStatuses.includes(status) || (action === ACTIONS.CLOSE && origin === ORIGIN.OVERLAY)) {
      actions.setTourOpen(false, "qsg");
      setStepIndex(0);
    } else if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  const handleDatapackTourCallback = (data: CallBackProps) => {
    const { status, action, origin, index, type } = data;
    const finishedStatuses: string[] = ["finished", "skipped"];
    if (finishedStatuses.includes(status) || (action === ACTIONS.CLOSE && origin === ORIGIN.OVERLAY)) {
      actions.setTourOpen(false, "datapacks");
      setStepIndex(0);
    } else if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };
  const handleSettingsTourCallback = (data: CallBackProps) => {
    const { status, action, origin, index, type } = data;
    const finishedStatuses: string[] = ["finished", "skipped"];
    if (finishedStatuses.includes(status) || (action === ACTIONS.CLOSE && origin === ORIGIN.OVERLAY)) {
      actions.setTourOpen(false, "settings");
      setStepIndex(0);
    } else if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };
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
  // triggered in two cases, if the user switches away from the datapacks page/tab while fetching datapacks or if fetching datapacks on the presets page
  const checkLoadingDatapacks = () => {
    const isOnDatapacksTab = location.pathname === "/settings" && state.settingsTabs.selected === "datapacks";
    const isOnDatapackPath = location.pathname === "/datapacks";
    if (state.loadingDatapacks && !(isOnDatapackPath || isOnDatapacksTab)) return true;
    return false;
  };
  return (
    <StyledEngineProvider injectFirst>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {location.pathname != "/verify" && <NavBar />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chart" element={<ChartTab />} />
            <Route path="/help/*" element={<Help />} />
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
            <Route path="/presets" element={<Presets />} />
            <Route path="/workshops" element={<Workshops />} />
            <Route path="/file-format-info" element={<FileFormatInfo />} />
            <Route path="/workshops/:id" element={<WorkshopDetails />} />
            <Route path="/crossplot" element={<CrossPlotChart />} />
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
            onClose={() => actions.compileChartRequest(navigate)}
          />
          <TSCDialogLoader
            open={state.isProcessingDatapacks}
            headerText={t("loading.loading-datapacks")}
            subHeaderText={t("loading.time")}
          />
          <TSCDialogLoader open={checkLoadingDatapacks()} headerText={t("loading.fetching-datapacks")} />
          <TSCYesNoPopup
            open={checkUnsavedChanges() && !checkLoadingDatapacks()}
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
          <Joyride
            continuous
            run={state.guides.isQSGOpen}
            steps={getQsg()}
            callback={handleQSGCallback}
            locale={{
              skip: t("tours.quit"),
              last: t("tours.finish"),
              back: t("tours.back"),
              nextLabelWithProgress: `${i18n.t("tours.next")} (${stepIndex + 1} / ${getQsg().length})`
            }}
            stepIndex={stepIndex}
            showProgress
            styles={{
              options: {
                zIndex: 10000,
                primaryColor: theme.palette.button.main,
                backgroundColor: theme.palette.secondaryBackground.main,
                arrowColor: theme.palette.secondaryBackground.main,
                textColor: theme.palette.text.primary
              }
            }}
          />
          <Joyride
            continuous
            run={state.guides.isDatapacksTourOpen}
            steps={getDatapackTour()}
            stepIndex={stepIndex}
            disableScrolling
            callback={handleDatapackTourCallback}
            locale={{
              skip: t("tours.quit"),
              last: t("tours.finish"),
              next: t("tours.next"),
              back: t("tours.back"),
              nextLabelWithProgress: `${i18n.t("tours.next")} (${stepIndex + 1} / ${getDatapackTour().length})`
            }}
            showProgress
            styles={{
              options: {
                zIndex: 200,
                primaryColor: theme.palette.button.main,
                backgroundColor: theme.palette.secondaryBackground.main,
                arrowColor: theme.palette.secondaryBackground.main,
                textColor: theme.palette.text.primary
              }
            }}
          />
          <Joyride
            continuous
            run={state.guides.isSettingsTourOpen}
            steps={getSettingsTour()}
            stepIndex={stepIndex}
            callback={handleSettingsTourCallback}
            locale={{
              skip: t("tours.quit"),
              last: t("tours.finish"),
              next: t("tours.next"),
              back: t("tours.back"),
              nextLabelWithProgress: `${i18n.t("tours.next")} (${stepIndex + 1} / ${getSettingsTour().length})`
            }}
            showProgress
            styles={{
              options: {
                zIndex: 200,
                primaryColor: theme.palette.button.main,
                backgroundColor: theme.palette.secondaryBackground.main,
                arrowColor: theme.palette.secondaryBackground.main,
                textColor: theme.palette.text.primary
              }
            }}
          />
        </ThemeProvider>
      </LocalizationProvider>
    </StyledEngineProvider>
  );
});
