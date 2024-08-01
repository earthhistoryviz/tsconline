import { useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig } from "@tsconline/shared";
import { context, state } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionSummary, AccordionDetails, Grid, Typography } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { TSCIcon, TSCButton, TSCCard, StyledScrollbar } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import "./Home.css";
import { SetDatapackConfigCompleteMessage, SetDatapackConfigMessage } from "./types";
import { fetchSettingsXML } from "./state/actions";
import { action } from "mobx";

const HeaderContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4)
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  fontSize: theme.typography.h2.fontSize
}));

const TSCOnlineHeader = () => {
  return (
    <HeaderContainer>
      <TSCIcon src={TSCreatorLogo} alt="Logo" size="80px" marginTop="20px" />
      <HeaderTitle variant="h2">Time Scale Creator Online</HeaderTitle>
    </HeaderContainer>
  );
};

export const Home = observer(function Home() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <div className="whole_page">
      <TSCOnlineHeader />
      {Object.entries(state.presets).map(([type, configArray]) => {
        return <TSCPresetHighlights key={type} navigate={navigate} configArray={configArray} type={type} />;
      })}
      <div className="bottom-button">
        <TSCButton
          className="remove-cache-button"
          style={{
            fontSize: theme.typography.pxToRem(12)
          }}
          onClick={() => {
            actions.removeCache();
            actions.resetState();
          }}>
          Remove Cache
        </TSCButton>
      </div>
    </div>
  );
});

const TSCPresetHighlights = observer(function TSCPresetHighlights({
  type,
  navigate,
  configArray
}: {
  type: string;
  navigate: NavigateFunction;
  configArray: ChartConfig[];
}) {
  const { actions } = useContext(context);
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };
  return (
    <>
      <Accordion
        className="preset-highlight"
        sx={{ border: `1px solid ${theme.palette.divider}` }}
        onChange={handleAccordionChange}
        expanded={expanded}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
          className="preset-summary">
          <Typography className="preset-type-title">{`${type} PRESETS`}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <StyledScrollbar>
            <Grid className="presets" container>
              {configArray.map((preset, index) => (
                <Grid item key={index} className="preset-item">
                  <TSCCard
                    preset={preset}
                    generateChart={async () => {
                      console.log("hello, tsccard");
                      let success;
                      const hasPreviousConfig = actions.setPreviousDatapackConfig(preset.datapacks.map((datapack) => datapack.file));
                      console.log("hasPreviousConfig" + hasPreviousConfig);
                      if (hasPreviousConfig) {
                        success = true;
                      } else {
                        const chartSettings = await fetchSettingsXML(preset.settings);
                        const setDatapackConfigWorker: Worker = new Worker(new URL("./util/workers/set-datapack-config.ts", import.meta.url), {
                          type: "module"
                        });
                        console.log("hello, tsccard2");
                        const message: SetDatapackConfigMessage = {
                          datapacks: preset.datapacks.map((datapack) => datapack.file), settingsPath: preset.settings,
                          chartSettings: chartSettings, stateCopy: JSON.stringify(state)
                        };
                        console.log("hello, tsccard3");
                        setDatapackConfigWorker.postMessage(message);
                        console.log("hello, tsccard4.5");

                        setDatapackConfigWorker.onmessage = async function (e: MessageEvent<SetDatapackConfigCompleteMessage>) {

                          const { status, value } = e.data;
                          console.log(status);
                          if (status === "success" && value) {
                            //actions.updateState(value);
                            //actions.initiateChartGeneration(navigate, "/home");
                            //actions.pushSnackbar("Saved Chart as PDF!", "success");

                            console.log("sucessfully set dp config");
                            success = await actions.afterSetDatapackConfig(value.columnRoot, value.foundDefaultAge, value.mapHierarchy, value.mapInfo, value.datapacks, value.chartSettings);
                            console.log("after:" + success);
                            console.log("when afterSetDatapackConfig finished:" + JSON.stringify(state.config.datapacks));

                            actions.initiateChartGeneration(navigate, "/home");
                          } else {
                            //actions.pushSnackbar("Saving Chart Timed Out", "info");
                            console.log("setting dp config timed out");
                          }

                          setDatapackConfigWorker.terminate();
                        }

                        console.log("Hello6");
                        // const success = await actions.setDatapackConfig(
                        //   preset.datapacks.map((datapack) => datapack.file),
                        //   preset.settings
                        // );
                        // wait to see if we can grab necessary data
                        // if (success) {
                        //   actions.initiateChartGeneration(navigate, "/home");
                        // }
                        //TODO add an error message saying the data is irregular and can't be loaded
                      }
                      console.log("success should be true:" + success);
                      if (success) {
                        console.log("should be here");
                        actions.initiateChartGeneration(navigate, "/home");
                      }
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </StyledScrollbar>
        </AccordionDetails>
      </Accordion>
    </>
  );
});
