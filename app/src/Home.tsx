import { useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { ChartConfig } from "@tsconline/shared";
import { context } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Typography,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { TSCIcon, TSCButton, TSCCard } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";

import "./Home.css";

const HeaderContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

const HeaderIcon = styled(TSCIcon)(({ theme }) => ({
  fontSize: theme.typography.h4.fontSize,
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.dark.main,
  fontSize: theme.typography.h2.fontSize,
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
  const handlePopupResponse = (response) => {
    actions.setUseDatapackSuggestedAge(response);
    actions.setUserResponded(true);
    actions.setShowSuggestedAgePopup(false);
  };
  const handleCloseDialog = () => {
    actions.setUserResponded(true);
    actions.setShowSuggestedAgePopup(false);
  };
  useEffect(() => {
    if (state.userResponded) {
      actions.setUserResponded(false);
      actions.generateChart();
      navigate('/chart');
    }
  }, [state.userResponded]);
  return (
    <div
      className="whole_page"
      style={{
        background: theme.palette.gradient.main,
      }}
    >
      <TSCOnlineHeader />
      {Object.entries(state.presets).map(([type, configArray]) => {
        return (
          <TSCPresetHighlights
            key={type}
            navigate={navigate}
            configArray={configArray}
            type={type}
          />
        );
      })}
      <TSCPopupDialog
        open={ state.showSuggestedAgePopup }
        title="Confirmation"
        message="Do you want to use the datapack suggested age span?"
        onYes={() => handlePopupResponse(true)}
        onNo={() => handlePopupResponse(false)}
        onClose={ handleCloseDialog }
      />
      <div className="bottom-button">
        <TSCButton
          className="remove-cache-button"
          style={{
            fontSize: theme.typography.pxToRem(12),
          }}
          onClick={() => {
            actions.removeCache();
            actions.resetState();
          }}
        >
          Remove Cache
        </TSCButton>
      </div>
    </div>
  );
});

const TSCPresetHighlights = observer(function TSCPresetHighlights({
  type,
  navigate,
  configArray,
}: {
  type: string;
  navigate: Function;
  configArray: ChartConfig[];
}) {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };
  return (
    <>
      <Accordion
        style={{
          background: "transparent",
          marginLeft: "5vh",
          marginRight: "5vh",
          border: "1px solid gray",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        onChange={handleAccordionChange}
        expanded={expanded}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
          style={{
            borderBottom: "1px solid rgba(0, 0, 0, 0.20)",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          }}
        >
          <Typography
            sx={{ fontSize: "1.5rem" }}
          >{`${type} PRESETS`}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid
            className="presets"
            container
            style={{
              display: "flex",
              flexWrap: "nowrap",
              overflowX: "auto",
              width: "auto",
              paddingBottom: "9vh",
            }}
          >
            {configArray.map((preset, index) => (
              <Grid
                item
                key={index}
                style={{ marginRight: "16px", marginLeft: "16px" }}
              >
                <TSCCard
                  color={theme.palette.navbar.main}
                  preset={preset}
                  generateChart={async () => {
                    const success = await actions.setDatapackConfig(
                      preset.datapacks.map((datapack) => datapack.file),
                      preset.settings
                    );
                    // wait to see if we can grab necessary data
                    if (success) {
                      actions.generateChart();
                      navigate("/chart");
                    }
                    //TODO add an error message saying the data is irregular and can't be loaded
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
});
