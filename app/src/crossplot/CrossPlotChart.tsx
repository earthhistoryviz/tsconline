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
import { AutoAwesome, AutoFixHigh, CachedOutlined, ChangeCircleRounded, ChatRounded } from "@mui/icons-material";
import TimeLine from "../assets/icons/axes=two.svg";
import { CustomTooltip, TSCButton, TSCDialogLoader } from "../components";
import { TSCIconButton, TSCSplitButton } from "../components/TSCButton";
import { useNavigate } from "react-router";

export const CROSSPLOT_MOBILE_WIDTH = 750;

export const CrossPlotChart: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const navigate = useNavigate();
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
        </Box>
      </ChartContext.Provider>
      {mobile ? <MobileBottomBar /> : <BottomBar />}
      <TSCDialogLoader open={state.crossPlot.converting || state.crossPlot.autoPlotting} transparentBackground />
    </>
  );
});

const BottomBar = () => {
  const { actions } = useContext(context);
  const navigate = useNavigate();
  const sx = {
    backgroundColor: "transparent"
  };
  return (
    <Box className={styles.buttons} sx={{ backgroundColor: "dark.main" }}>
      <CustomTooltip title={"Generate Cross Plot"}>
        <IconButton sx={sx} onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
          <AutoAwesome />
        </IconButton>
      </CustomTooltip>
      <TSCSplitButton
        main={{
          icon: <CachedOutlined />,
          onClick: () => {}
        }}
        options={[
          {
            label: "Convert and Generate",
            onClick: () => {}
          },
          {
            label: "Convert and Save To Computer",
            onClick: () => {}
          },
          {
            label: "Convert and Save To Profile",
            onClick: () => {}
          }
        ]}
      />
      <TSCButton className={styles.convert} onClick={async () => actions.sendCrossPlotConversionRequest()}>
        Convert Datapack
      </TSCButton>
      <CustomTooltip title={"Auto Plot"}>
        <IconButton sx={sx} onClick={() => actions.autoPlotCrossPlot()}>
          <AutoFixHigh />
        </IconButton>
      </CustomTooltip>
    </Box>
  );
};

const MobileBottomBar = () => {
  const { actions } = useContext(context);
  const navigate = useNavigate();
  return (
    <Box className={styles.mobileButtons}>
      <TSCButton
        className={styles.mobileGenerate}
        onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
        Generate Cross Plot
      </TSCButton>
      <TSCButton className={styles.mobileAutoPlot} onClick={() => actions.autoPlotCrossPlot()}>
        Auto Plot
      </TSCButton>
      <TSCButton className={styles.mobileConvert} onClick={async () => actions.sendCrossPlotConversionRequest()}>
        Convert Datapack
      </TSCButton>
    </Box>
  );
};
