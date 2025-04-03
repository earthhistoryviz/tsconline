import { observer } from "mobx-react-lite";
import { Chart, ChartContext } from "../Chart";
import React, { useContext, useRef } from "react";
import { context } from "../state";
import { TSCCrossPlotSVGComponent } from "../components/TSCCrossPlotSVGComponent";
import { CrossPlotSideBar, MobileCrossPlotSideBar } from "./CrossPlotSideBar";
import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import styles from "./CrossPlotChart.module.css";
import MarkerIcon from "../assets/icons/model=Default.svg";
import ModelsIcon from "../assets/icons/model=model.svg";
import { AutoAwesome, AutoFixHigh, CachedOutlined, ChatRounded } from "@mui/icons-material";
import TimeLine from "../assets/icons/axes=two.svg";
import { CustomTooltip, TSCDialogLoader } from "../components";
import { TSCSplitButton } from "../components/TSCButton";
import { useNavigate } from "react-router";

export const CROSSPLOT_MOBILE_WIDTH = 750;

export const CrossPlotChart: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const mobile = useMediaQuery(`(max-width:${CROSSPLOT_MOBILE_WIDTH}px`);
  return (
    <>
      <ChartContext.Provider
        value={{
          chartTabState: state.crossPlot.state,
          otherChartOptions: [
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
            <BottomBar />
          </Box>
        </Box>
      </ChartContext.Provider>
      <TSCDialogLoader open={state.crossPlot.converting || state.crossPlot.autoPlotting} transparentBackground />
    </>
  );
});

const sx = {
  backgroundColor: "transparent",
  color: "white",
  borderRadius: "0px",
  "&:hover": {
    backgroundColor: "hover.main"
  }
};
const BottomBar = () => {
  const { actions } = useContext(context);
  const navigate = useNavigate();
  const mobile = useMediaQuery(`(max-width:${CROSSPLOT_MOBILE_WIDTH}px`);
  return (
    <Box className={mobile ? styles.mobileButtons : styles.buttons} sx={{ backgroundColor: "dark.main" }}>
      <CustomTooltip title={"Generate Cross Plot"}>
        <IconButton sx={sx} onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
          <AutoAwesome />
        </IconButton>
      </CustomTooltip>
      <TSCSplitButton
        main={{
          label: "Generate Converted Chart",
          icon: <CachedOutlined />,
          onClick: () => {
            actions.pushSnackbar("This feature is not yet implemented", "warning");
          }
        }}
        options={[
          {
            label: "Generate Converted Chart",
            onClick: () => {
              actions.pushSnackbar("This feature is not yet implemented", "warning");
            }
          },
          {
            label: "Download Converted Datapack",
            onClick: async () => actions.sendCrossPlotConversionRequest()
          },
          {
            label: "Upload Converted Datapack To Profile",
            onClick: () => {
              actions.pushSnackbar("This feature is not yet implemented", "warning");
            }
          }
        ]}
      />
      <CustomTooltip title={"Auto Plot"}>
        <IconButton sx={sx} onClick={() => actions.autoPlotCrossPlot()}>
          <AutoFixHigh />
        </IconButton>
      </CustomTooltip>
    </Box>
  );
};
