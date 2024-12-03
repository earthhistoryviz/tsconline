import { createRef, useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig, DatapackConfigForChartRequest, assertDatapackConfigForChartRequest } from "@tsconline/shared";
import { context } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionSummary, AccordionDetails, Grid, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TSCButton, TSCCard, StyledScrollbar, Lottie, Attribution } from "./components";
import "./Home.css";
import { ErrorCodes } from "./util/error-codes";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { devSafeUrl } from "./util";
import DownArrow from "./assets/icons/down-arrow.json";

export const Home = observer(function Home() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getStartedRef = createRef<HTMLDivElement>();
  const presetsRef = createRef<HTMLDivElement>();
  const handleScrollToPreset = () => {
    // accounts for navbar height
    if (presetsRef?.current) {
      const elementTop = presetsRef.current.getBoundingClientRect().top;
      const offset = 72;
      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth"
      });
    }
  };
  return (
    <div className="whole_page">
      <Box className="header-section-landing-page" sx={{ backgroundColor: "secondaryBackground.main" }}>
        <Box className="sub-header-section-landing-page">
          <Box className="sub-header-section-landing-page-text">
            <Typography variant="h2" fontWeight="700">
              {"Welcome to TimeScale Creator!"}
            </Typography>
            <Typography className="sub-header-section-landing-page-description">
              {
                "TimeScale Creator is an advanced online cloud service designed to help you explore and visualize the geologic time scale with ease. With access to a vast internal database of over 20,000 global and regional events—including biologic, geomagnetic, sea-level, and stable isotope data—TimeScale Creator is the ultimate tool for researchers, educators, and enthusiasts of Earth history."
              }
            </Typography>
          </Box>
          <img
            loading="lazy"
            rel="preload"
            className="sub-header-section-landing-page-image"
            src={devSafeUrl("/public/website-images/landing-page.png")}
          />
        </Box>
        <Box className="get-started-landing-page">
          <Box className="get-started-button-container" onClick={handleScrollToPreset}>
            <Typography marginBottom="-6px" variant="h5" fontSize="1.8rem" fontWeight="700" ref={getStartedRef}>
              {"Get Started"}
            </Typography>
            <Lottie
              animationData={DownArrow}
              speed={1}
              width={60}
              height={60}
              playOnHover
              triggerOnRef={getStartedRef}
            />
          </Box>
        </Box>
      </Box>
      <Box ref={presetsRef}>
        {Object.entries(state.presets).map(([type, configArray]) => {
          return <TSCPresetHighlights key={type} navigate={navigate} configArray={configArray} type={type} />;
        })}
      </Box>
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
      <Attribution>
      <a href="https://iconscout.com/lottie-animations/down-arrow" className="text-underline font-size-sm" target="_blank">Down Arrow</a> by <a href="https://iconscout.com/contributors/graphic-room" className="text-underline font-size-sm" target="_blank">Venus</a>
      </Attribution>
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
