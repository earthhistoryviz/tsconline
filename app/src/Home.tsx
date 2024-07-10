import { useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig } from "@tsconline/shared";
import { context } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionSummary, AccordionDetails, Grid, Typography } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { TSCIcon, TSCButton, TSCCard, StyledScrollbar } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import "./Home.css";

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
                      const success = await actions.setDatapackConfig(
                        preset.datapacks.map((datapack) => datapack.file),
                        preset.settings
                      );
                      // wait to see if we can grab necessary data
                      if (success) {
                        actions.initiateChartGeneration(navigate, "/home");
                      }
                      //TODO add an error message saying the data is irregular and can't be loaded
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
