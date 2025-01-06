import { useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig, DatapackConfigForChartRequest } from "@tsconline/shared";
import { context } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionSummary, AccordionDetails, Grid, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TSCCard, StyledScrollbar, TSCDialogLoader } from "./components";
import "./Home.css";
import { ErrorCodes } from "./util/error-codes";
import _ from "lodash";
import { useTranslation } from "react-i18next";

export const Presets = () => {
  const { state } = useContext(context);
  const navigate = useNavigate();
  return (
    <Box>
      {state.skeletonStates.presetsLoading ? (
        <>
          <TSCPresetHighlights navigate={navigate} configArray={[]} type="BASIC" />
          <TSCPresetHighlights navigate={navigate} configArray={[]} type="MAP" />
        </>
      ) : (
        Object.entries(state.presets).map(([type, configArray]) => {
          return <TSCPresetHighlights key={type} navigate={navigate} configArray={configArray} type={type} />;
        })
      )}
    </Box>
  );
};
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
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };
  return (
    <>
      <TSCDialogLoader open={loading} headerText="Fetching Datapacks" />
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
                      const datapacks: DatapackConfigForChartRequest[] = [];
                      try {
                        for (const dp of preset.datapacks) {
                          const stateDatapack = state.datapacks.find(
                            (d) => d.title === dp.name && d.type === "official"
                          );
                          if (stateDatapack) {
                            datapacks.push(_.cloneDeep(stateDatapack));
                            continue;
                          }
                          setLoading(true);
                          const fetchedDatapack = await actions.fetchOfficialDatapack(dp.name);
                          if (!fetchedDatapack) {
                            actions.pushError(ErrorCodes.UNABLE_TO_FETCH_DATAPACKS);
                            return;
                          }
                          actions.addDatapack(fetchedDatapack);
                          datapacks.push(_.cloneDeep(fetchedDatapack));
                        }
                      } catch (e) {
                        actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
                        return;
                      } finally {
                        setLoading(false);
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
