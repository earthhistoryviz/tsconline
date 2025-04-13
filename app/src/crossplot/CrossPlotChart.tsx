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

export const CROSSPLOT_MOBILE_WIDTH = 750;
export type SaveAction = "download" | "upload";

export const CrossPlotChart: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const mobile = useMediaQuery(`(max-width:${CROSSPLOT_MOBILE_WIDTH}px`);
  const [userInput, setUserInput] = useState("");
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
              label: "Save Converted Datapack",
              onClick: () => {
                setSaveAction("download");
                setSaveFileNameModalOpen(true);
              }
            },
            {
              label: "Upload Converted Datapack To Profile",
              onClick: () => {
                setSaveAction("upload");
                setSaveFileNameModalOpen(true);
              }
            }
          ],
          actionChartOptions: [
            {
              label: "Auto Plot",
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
              label: "Timeline On/Off",
              icon: <img src={TimeLine} width="24" height="24" />,
              onChange: (bool: boolean) =>
                actions.setChartTabState(state.crossPlot.state, { chartTimelineEnabled: bool }),
              value: state.crossPlot.state.chartTimelineEnabled
            },
            {
              label: "Models",
              icon: <img src={ModelsIcon} width="24" height="24" />,
              onChange: actions.setCrossPlotModelMode,
              value: state.crossPlot.modelMode
            },
            {
              label: "Markers",
              icon: <img src={MarkerIcon} width="24" height="24" />,
              onChange: actions.setCrossPlotMarkerMode,
              value: state.crossPlot.markerMode
            },
            {
              label: "Show Tooltips",
              icon: <ChatRounded />,
              onChange: actions.setCrossPlotShowTooltips,
              value: state.crossPlot.showTooltips
            }
          ]
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
      title={saveAction === "download" ? "Save file as...": "Upload datapack as..."}
        fileName={userInput}
        saveAction={saveAction}
        setFileName={setUserInput}
        open={saveFileNameModalOpen}
        setOpen={setSaveFileNameModalOpen}
        onClose={() => setSaveFileNameModalOpen(false)}
        disableRestoreFocus
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            if (!userInput) {
              actions.pushSnackbar("Filename is not valid", "warning");
            }
            try {
              setSaveFileNameModalOpen(false);
              setLoading(true);
              e.preventDefault(); // to stop website from reloading
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
  if (!state.crossPlot.state.madeChart && !state.crossPlot.state.chartLoading) {
    return (
      <Box className={styles.modal}>
        <Box className={styles.modalContent} bgcolor="secondaryBackground.main">
          <Typography fontSize="1.25rem" fontWeight={500}>
            Crossplot Chart Not Created
          </Typography>
          <Typography fontSize="1rem" fontWeight={400}>
            Please configure your desired crossplot settings and click the button below
            to generate a crossplot chart.
          </Typography>
          <Box className={styles.changeButtons}>
            <TSCButton
              startIcon={<AutoAwesome />}
              buttonType="gradient"
              onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
              Generate Crossplot
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
          Chart Out of Date
        </Typography>
        <Typography fontSize="1rem" fontWeight={400}>
          When you're ready, click the button below to apply your changes.
        </Typography>
        <Box className={styles.changeButtons}>
          <Button variant="outlined">Revert Changes</Button>
          <TSCButton buttonType="gradient" onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
            Apply Changes
          </TSCButton>
        </Box>
      </Box>
    </Box>
  );
});
