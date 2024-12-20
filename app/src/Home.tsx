import { createRef, useState } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { ChartConfig, DatapackConfigForChartRequest, assertDatapackConfigForChartRequest } from "@tsconline/shared";
import { context, state } from "./state";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Typography,
  Box,
  IconButton,
  Chip,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TSCButton, TSCCard, StyledScrollbar, Lottie, Attribution, CustomDivider } from "./components";
import "./Home.css";
import { ErrorCodes } from "./util/error-codes";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { devSafeUrl } from "./util";
import DownArrow from "./assets/icons/down-arrow.json";
import { useTransition, animated } from "@react-spring/web";
import { createGradient } from "./util/util";
import { TSCStepper } from "./components/TSCStepper";

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
      <Box sx={{ backgroundColor: "secondaryBackground.main" }}>
        <Box className="sub-header-section-landing-page">
          <Box className="sub-header-section-landing-page-text">
            <Typography className="landing-page-title" variant="h2" fontWeight="700">
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
      <CustomDivider />
      <Carousel />
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
        <a href="https://iconscout.com/lottie-animations/down-arrow" className="text-underline font-size-sm">
          Down Arrow
        </a>{" "}
        by{" "}
        <a href="https://iconscout.com/contributors/graphic-room" className="text-underline font-size-sm">
          Venus
        </a>
      </Attribution>
    </div>
  );
});
const Carousel = observer(function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const transitions = useTransition(activeIndex, {
    keys: activeIndex,
    from: {
      opacity: 0,
      transform: direction === "right" ? "translateX(100%)" : "translateX(-100%)"
    },
    enter: { opacity: 1, transform: "translateX(0%)" },
    leave: {
      opacity: 0,
      transform: direction === "right" ? "translateX(-100%)" : "translateX(100%)"
    },
    config: { duration: 500 },
    onStart: () => {
      setIsAnimating(true);
    },
    onRest: () => {
      setIsAnimating(false);
    }
  });
  const carouselContent = [
    {
      title: "Customize Your Chart",
      description: "",
      bullets: [
        {
          title: "Customize Chart Appearance",
          description: "Personalize your chart by adjusting the appearance, colors, and fonts to suit your preferences."
        },
        {
          title: "Save Custom Settings",
          description:
            "Save your custom chart settings for future use and easy access to your preferred configurations."
        },
        {
          title: "Share Your Charts",
          description:
            "Easily share your custom charts with others via a simple link or by downloading the chart as an image."
        }
      ],
      image: state.user.settings.darkMode ? "customization-example-dark.png" : "customization-example-light.png"
    },
    {
      title: "Interactive Map Points",
      description: "",
      bullets: [
        {
          title: "Toggle Columns Directly on the Map",
          description: "Select specific areas to focus on by enabling or disabling chart columns directly on the map."
        },
        {
          title: "Dynamic Age Slider",
          description: "Explore how rock formations and geologic events change over time with a simple slider."
        },
        {
          title: "Link Charts to Locations",
          description: "Map points connect chart columns to real-world locations for intuitive visualization."
        }
      ],
      image: "interactive-map-points-feature.png"
    },
    {
      title: "Search Within Columns",
      description: "",
      bullets: [
        {
          title: "Find Columns/Events Quickly",
          description:
            "Search for specific columns or events within the chart to quickly locate and focus on relevant information."
        },
        {
          title: "Extend/Center Age Range",
          description:
            "Extend or center the age range to focus on the details and gurantee the inclusion of the desired information in the chart."
        },
        {
          title: "View Specific Notes",
          description: "Access detailed notes and information about specific events directly from the chart."
        }
      ],
      image: state.user.settings.darkMode ? "search-meso-dark.png" : "search-meso.png"
    },
    {
      title: "Upload Your Own!",
      description: "",
      bullets: [
        {
          title: "Create Custom Datapacks",
          description:
            "Upload your own data to create custom datapacks and generate charts based on your unique research and findings."
        },
        {
          title: "Showcase Your Research",
          description:
            "Publish your custom datapacks to share your research, findings, and insights with the global scientific community."
        },
        {
          title: "Collaborate with Others",
          description: "View other users' datapacks and collaborate to expand your knowledge and expertise."
        }
      ],
      image: "cloud.png"
    }
  ];
  const onNext = () => {
    if (isAnimating) return;
    setDirection("right");
    setActiveIndex((activeIndex + 1) % carouselContent.length);
  };
  const onPrevious = () => {
    if (isAnimating) return;
    setDirection("left");
    setActiveIndex((activeIndex - 1 + carouselContent.length) % carouselContent.length);
  };
  const jumpToIndex = (index: number) => {
    if (isAnimating) return;
    if (index < activeIndex) {
      setDirection("left");
    } else {
      setDirection("right");
    }
    setActiveIndex(index);
  };
  const buttonStyle = {
    backgroundColor: "dark.light",
    color: "dark.contrastText",
    "&:hover": {
      backgroundColor: "dark.main"
    }
  };
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  return (
    <Box display="flex" flexDirection="column">
      {!isMobile && (
        <Box className="home-landing-page-carousel-chips">
          <Box
            className="home-landing-page-carousel-chips-container"
            sx={{ backgroundColor: "secondaryBackground.main" }}>
            {carouselContent.map((content, index) => (
              <Chip
                sx={{
                  background: index === activeIndex ? gradient.dark : "secondaryBackground.main",
                  color: index === activeIndex ? "button.contrastText" : "secondaryBackground.contrastText",
                  opacity: index === activeIndex ? 1 : 0.6,
                  ":hover": {
                    backgroundColor: "button.main",
                    color: "button.contrastText"
                  }
                }}
                className="landing-page-carousel-chip"
                size="medium"
                label={content.title}
                key={index}
                onClick={() => jumpToIndex(index)}
              />
            ))}
          </Box>
        </Box>
      )}
      <Box className="home-landing-page-carousel-container">
        {transitions((style, index) => (
          <animated.div
            className="home-landing-page-carousel"
            style={{
              ...style,
              position: "absolute",
              width: "100%",
              height: "100%"
            }}>
            <Box className="home-landing-page-carousel-text">
              <Typography className="home-landing-page-carousel-title">{carouselContent[index].title}</Typography>
              <CustomDivider />
              <ul>
                {carouselContent[index].bullets.map((bullet, index) => (
                  <li key={index}>
                    <Typography variant="body1" className="home-landing-page-carousel-bullet-title">
                      {bullet.title}
                    </Typography>
                    <Typography variant="body2" className="home-landing-page-carousel-bullet">
                      {bullet.description}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Box>
            <Box className="home-landing-page-carousel-image-container">
              <img
                loading="lazy"
                className="home-landing-page-carousel-image"
                src={devSafeUrl(`/public/website-images/${carouselContent[index].image}`)}
                alt={carouselContent[index].title}
              />
            </Box>
          </animated.div>
        ))}
        {!isMobile && (
          <>
            {activeIndex !== 0 && (
              <IconButton className="home-landing-page-carousel-left-arrow" onClick={onPrevious} sx={buttonStyle}>
                <ChevronLeft className="home-landing-page-carousel-left-arrow-icon" />
              </IconButton>
            )}
            {activeIndex !== carouselContent.length - 1 && (
              <IconButton className="home-landing-page-carousel-right-arrow" onClick={onNext} sx={buttonStyle}>
                <ChevronRight className="home-landing-page-carousel-right-arrow-icon" />
              </IconButton>
            )}
          </>
        )}
      </Box>
      <CustomDivider />
      {isMobile && (
        <Box className="home-landing-page-carousel-chips-mobile">
          <TSCStepper
            amountOfSteps={carouselContent.length}
            activeStep={activeIndex}
            size={15}
            setActiveStep={jumpToIndex}
          />
        </Box>
      )}
    </Box>
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
