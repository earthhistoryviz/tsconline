import { useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig, DatapackConfigForChartRequest, assertDatapackConfigForChartRequest } from "@tsconline/shared";
import { context } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionSummary, AccordionDetails, Grid, Typography } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { TSCIcon, TSCButton, TSCCard, StyledScrollbar } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import "./Home.css";
import { ErrorCodes } from "./util/error-codes";
import _ from "lodash";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <HeaderContainer>
      <TSCIcon src={TSCreatorLogo} alt="Logo" size="80px" marginTop="20px" />
      <HeaderTitle variant="h2">{t("title.main")}</HeaderTitle>
    </HeaderContainer>
  );
};

export const Home = observer(function Home() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
          onClick={async () => {
            actions.removeCache();
            actions.resetState();
          }}>
          {t("button.remove-cache")}
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
  const { actions, state } = useContext(context);
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();
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
          <Typography className="preset-type-title">{t(`presets.${type}`)}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <StyledScrollbar>
            <Grid className="presets" container>
              {configArray.map((preset, index) => (
                <Grid item key={index} className="preset-item">
                  <TSCCard
                    preset={preset}
                    generateChart={async () => {
                      let datapacks: DatapackConfigForChartRequest[] = [];
                      try {
                        datapacks = preset.datapacks.map((dp) => {
                          const datapack = _.cloneDeep(
                            state.datapacks.find((d) => d.title === dp.name && d.type == "official")
                          );
                          assertDatapackConfigForChartRequest(datapack);
                          return datapack;
                        });
                      } catch (e) {
                        actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
                        return;
                      }
                      const success = await actions.processDatapackConfig(datapacks, preset.settings);
                      if (!success) return;
                      actions.initiateChartGeneration(navigate, "/home");
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
