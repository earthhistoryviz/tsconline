import { observer } from "mobx-react-lite";
import { Chart, ChartContext } from "../Chart";
import React, { useContext, useEffect, useRef, useState } from "react";
import { context } from "../state";
import { TSCCrossPlotSVGComponent } from "../components/TSCCrossPlotSVGComponent";
import { CrossPlotSideBar, MobileCrossPlotSideBar } from "./CrossPlotSideBar";
import { Box, Button, Typography, useMediaQuery, useTheme } from "@mui/material";
import styles from "./CrossPlotChart.module.css";
import MarkerIcon from "../assets/icons/model=Default.svg";
import ModelsIcon from "../assets/icons/model=model.svg";
import { AutoAwesome, AutoFixHigh, ChatRounded } from "@mui/icons-material";
import TimeLine from "../assets/icons/axes=two.svg";
import { TSCDialogLoader } from "../components";
import { TSCButton } from "../components/TSCButton";
import { useNavigate } from "react-router";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { CrossPlotFileNameModal } from "./CrossPlotFileNameModal";
import { useTranslation } from "react-i18next";

export const CROSSPLOT_MOBILE_WIDTH = 750;
export type SaveAction = "download" | "upload";

export const CrossPlotChart: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const mobile = useMediaQuery(`(max-width:${CROSSPLOT_MOBILE_WIDTH}px`);
  const [userInput, setUserInput] = useState("conversion");
  const [saveFileNameModalOpen, setSaveFileNameModalOpen] = useState(false);
  const [saveAction, setSaveAction] = useState<SaveAction>("download");
  const shouldLoadRecaptcha = state.isLoggedIn;
  useEffect(() => {
    if (shouldLoadRecaptcha) loadRecaptcha();
    return () => {
      if (shouldLoadRecaptcha) removeRecaptcha();
    };
  }, []);
  return (
    <>
      <ChartContext.Provider
        value={{
          chartTabState: state.crossPlot.state,
          altSaveOptions: [
            {
              label: t("crossPlot.options.download-converted-datapack"),
              onClick: () => {
                setSaveAction("download");
                setSaveFileNameModalOpen(true);
              }
            },
            {
              label: t("crossPlot.options.upload-converted-datapack"),
              onClick: () => {
                setSaveAction("upload");
                setSaveFileNameModalOpen(true);
              }
            }
          ],
          actionChartOptions: [
            {
              label: t("crossPlot.options.auto-plot"),
              icon: <AutoFixHigh />,
              onClick: async () => {
                try {
                  setLoading(true);
                  actions.autoPlotCrossPlot;
                } finally {
                  setLoading(false);
                }
              }
            }
          ],
          stateChartOptions: [
            {
              label: t("crossPlot.options.timeline"),
              icon: <img src={TimeLine} width="24" height="24" />,
              onChange: (bool: boolean) =>
                actions.setChartTabState(state.crossPlot.state, { chartTimelineEnabled: bool }),
              value: state.crossPlot.state.chartTimelineEnabled
            },
            {
              label: t("crossPlot.options.models"),
              icon: <img src={ModelsIcon} width="24" height="24" />,
              onChange: actions.setCrossPlotModelMode,
              value: state.crossPlot.modelMode
            },
            {
              label: t("crossPlot.options.markers"),
              icon: <img src={MarkerIcon} width="24" height="24" />,
              onChange: actions.setCrossPlotMarkerMode,
              value: state.crossPlot.markerMode
            },
            {
              label: t("crossPlot.options.show-tooltips"),
              icon: <ChatRounded />,
              onChange: actions.setCrossPlotShowTooltips,
              value: state.crossPlot.showTooltips
            }
          ],
          downloadOptionLabel: t("crossPlot.options.save")
        }}>
        <Box className={mobile ? styles.containerMobile : styles.container}>
          {mobile ? <MobileCrossPlotSideBar ref={ref} /> : <CrossPlotSideBar ref={ref} />}
          <Box gridArea="chart" position="relative">
            <Chart
              Component={TSCCrossPlotSVGComponent}
              disableDoubleClick
              refList={[
                {
                  ref: ref,
                  id: mobile ? "crossplot-mobile-sidebar" : "crossplot-sidebar"
                }
              ]}
              style={{
                border: "none",
                borderTop: `2px solid ${theme.palette.divider}`
              }}
            />
            <MismatchModal />
          </Box>
        </Box>
      </ChartContext.Provider>
      <CrossPlotFileNameModal
        title={
          saveAction === "download" ? t("crossPlot.save-modal.save-filename") : t("crossPlot.save-modal.upload-title")
        }
        fileName={userInput}
        saveAction={saveAction}
        setFileName={setUserInput}
        open={saveFileNameModalOpen}
        setOpen={setSaveFileNameModalOpen}
        onClose={() => setSaveFileNameModalOpen(false)}
        disableRestoreFocus
        placeholder={saveAction === "download" ? "Enter filename" : "Enter datapack title"}
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault(); // to stop website from reloading
            if (!userInput) {
              actions.pushSnackbar("Filename is not valid", "warning");
              return;
            }
            try {
              setSaveFileNameModalOpen(false);
              setLoading(true);
              // get the value of the input
              if (saveAction === "download") {
                actions.saveConvertedDatapack(navigate, userInput);
              } else {
                actions.uploadConvertedDatapackToProfile(navigate, userInput);
              }
            } finally {
              setLoading(false);
            }
          }
        }}
      />
      <TSCDialogLoader open={loading} transparentBackground />
    </>
  );
});

const MismatchModal: React.FC = observer(() => {
  const navigate = useNavigate();
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  if (!state.crossPlot.state.madeChart && !state.crossPlot.state.chartLoading) {
    return (
      <Box className={styles.modal}>
        <Box className={styles.modalContent} bgcolor="secondaryBackground.main">
          <Typography fontSize="1.25rem" fontWeight={500}>
            {t("crossPlot.not-created.title")}
          </Typography>
          <Typography fontSize="1rem" fontWeight={400}>
            {t("crossPlot.not-created.description")}
          </Typography>
          <Box className={styles.changeButtons}>
            <TSCButton
              startIcon={<AutoAwesome />}
              buttonType="gradient"
              onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
              {t("crossPlot.not-created.generate")}
            </TSCButton>
          </Box>
        </Box>
      </Box>
    );
  }
  if (state.crossPlot.state.matchesSettings) return null;
  return (
    <Box className={styles.modal}>
      <Box className={styles.modalContent} bgcolor="secondaryBackground.main">
        <Typography fontSize="1.25rem" fontWeight={500}>
          {t("crossPlot.out-of-date.title")}
        </Typography>
        <Typography fontSize="1rem" fontWeight={400}>
          {t("crossPlot.out-of-date.description")}
        </Typography>
        <Box className={styles.changeButtons}>
          <Button variant="outlined">{t("crossPlot.out-of-date.revert")}</Button>
          <TSCButton buttonType="gradient" onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
            {t("crossPlot.out-of-date.apply")}
          </TSCButton>
        </Box>
      </Box>
    </Box>
  );
});
