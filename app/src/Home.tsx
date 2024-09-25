import { createRef, useState, useEffect, cloneElement, forwardRef, useEffect } from "react";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { context, state } from "./state";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  DateRange,
  East,
  FolderCopy,
  HelpOutline,
  RocketLaunch,
  TableChart,
  Tune
} from "@mui/icons-material";
import { Typography, Box, IconButton, Chip, useMediaQuery, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TSCButton, Attribution, CustomDivider } from "./components";
import "./Home.css";
import { useTranslation } from "react-i18next";
import { devSafeUrl } from "./util";
import { createGradient } from "./util/util";
import { TSCStepper } from "./components/TSCStepper";

export const Home = observer(function Home() {
  const { actions } = useContext(context);
  const theme = useTheme();
  const [hoveringGetStarted, setHoveringGetStarted] = useState(false);
  const { t } = useTranslation();
  const scrollRef = createRef<HTMLDivElement>();
  const handleScrollToPreset = () => {
    if (scrollRef?.current) {
      const elementTop = scrollRef.current.getBoundingClientRect().top;
      const currentScroll = window.scrollY;
      // accounts for navbar height
      const offset = 72;
      window.scrollTo({
        top: elementTop + currentScroll - offset,
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
              {t("landing-page.welcome")}
            </Typography>
            <Typography className="sub-header-section-landing-page-description">
              {t("landing-page.welcome-desc")}
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
          <Box
            className="get-started-button-container"
            onClick={handleScrollToPreset}
            onMouseEnter={() => setHoveringGetStarted(true)}
            onMouseLeave={() => setHoveringGetStarted(false)}>
            <motion.div
              animate={{ scale: hoveringGetStarted ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 11 }}
              style={{ display: "inline-block" }}>
              <Typography marginBottom="-6px" variant="h5" fontSize="1.8rem" fontWeight="700">
                {t("landing-page.get-started")}
              </Typography>
            </motion.div>
            <motion.div
              initial={{ y: 0 }}
              whileHover={{ y: 10 }}
              animate={{ y: hoveringGetStarted ? 10 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ display: "inline-block" }}>
              <ChevronRight className="get-started-button-landing-page" />
            </motion.div>
          </Box>
        </Box>
      </Box>
      <CustomDivider />
      <Carousel ref={scrollRef} />
      <LandingPageCards />
      <ChartCreationSteps />
      {import.meta.env.DEV && (
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
      )}
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
const Carousel = observer(
  forwardRef<HTMLDivElement>(function Carousel(props, ref) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [paused, setPaused] = useState(false);
    const theme = useTheme();
    const { t } = useTranslation();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    useEffect(() => {
      if (!paused && activeIndex !== carouselContent.length - 1) {
        const interval = setInterval(() => {
          onNext();
        }, 5000);
        return () => clearInterval(interval);
      }
    }, [paused, activeIndex]);
    const carouselContent = [
      {
        title: t("landing-page.carousel.customize-chart.title"),
        bullets: [
          {
            title: t("landing-page.carousel.customize-chart.customize-chart-appearance.title"),
            description: t("landing-page.carousel.customize-chart.customize-chart-appearance.description")
          },
          {
            title: t("landing-page.carousel.customize-chart.save-custom-settings.title"),
            description: t("landing-page.carousel.customize-chart.save-custom-settings.description")
          },
          {
            title: t("landing-page.carousel.customize-chart.share-your-charts.title"),
            description: t("landing-page.carousel.customize-chart.share-your-charts.description")
          }
        ],
        image: state.user.settings.darkMode ? "customization-example-dark.png" : "customization-example-light.png"
      },
      {
        title: t("landing-page.carousel.interactive-map-points.title"),
        bullets: [
          {
            title: t("landing-page.carousel.interactive-map-points.toggle-columns.title"),
            description: t("landing-page.carousel.interactive-map-points.toggle-columns.description")
          },
          {
            title: t("landing-page.carousel.interactive-map-points.age-slider.title"),
            description: t("landing-page.carousel.interactive-map-points.age-slider.description")
          },
          {
            title: t("landing-page.carousel.interactive-map-points.link-charts.title"),
            description: t("landing-page.carousel.interactive-map-points.link-charts.description")
          }
        ],
        image: "interactive-map-points-feature.png"
      },
      {
        title: t("landing-page.carousel.search-columns.title"),
        bullets: [
          {
            title: t("landing-page.carousel.search-columns.find-columns.title"),
            description: t("landing-page.carousel.search-columns.find-columns.description")
          },
          {
            title: t("landing-page.carousel.search-columns.age-range.title"),
            description: t("landing-page.carousel.search-columns.age-range.description")
          },
          {
            title: t("landing-page.carousel.search-columns.notes.title"),
            description: t("landing-page.carousel.search-columns.notes.description")
          }
        ],
        image: state.user.settings.darkMode ? "search-meso-dark.png" : "search-meso.png"
      },
      {
        title: t("landing-page.carousel.upload.title"),
        bullets: [
          {
            title: t("landing-page.carousel.upload.custom.title"),
            description: t("landing-page.carousel.upload.custom.description")
          },
          {
            title: t("landing-page.carousel.upload.showcase.title"),
            description: t("landing-page.carousel.upload.showcase.description")
          },
          {
            title: t("landing-page.carousel.upload.collaborate.title"),
            description: t("landing-page.carousel.upload.collaborate.description")
          }
        ],
        image: "cloud.png"
      }
    ];
    const onNext = () => {
      if (activeIndex === carouselContent.length - 1) return;
      setDirection(1);
      setActiveIndex((activeIndex + 1) % carouselContent.length);
    };
    const pauseAutoSlide = () => {
      setPaused(true);
    };
    const resumeAutoSlide = () => {
      setPaused(false);
    };
    const onPrevious = () => {
      if (activeIndex === 0) return;
      setDirection(-1);
      setActiveIndex((activeIndex - 1 + carouselContent.length) % carouselContent.length);
    };
    const jumpToIndex = (index: number) => {
      if (index < activeIndex) {
        setDirection(-1);
      } else {
        setDirection(1);
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
    const variants = {
      enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0
      }),
      center: {
        x: 0,
        opacity: 1,
        transition: {
          x: { type: "spring", stiffness: 150, damping: 30 },
          opacity: { duration: 0.8 }
        }
      },
      exit: (direction: number) => ({
        x: direction > 0 ? "-100%" : "100%",
        opacity: 0,
        transition: {
          x: { type: "spring", stiffness: 150, damping: 30 },
          opacity: { duration: 0.8 }
        }
      })
    };
    const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
    return (
      <Box display="flex" flexDirection="column" ref={ref}>
        {!isMobile && (
          <Box className="home-landing-page-carousel-chips">
            <Box
              className="home-landing-page-carousel-chips-container"
              sx={{ backgroundColor: "secondaryBackground.main" }}>
              {carouselContent.map((content, index) => (
                <Chip
                  sx={{
                    ...(index === activeIndex && { background: gradient.dark }),
                    ...(index !== activeIndex && { backgroundColor: "secondaryBackground.main" }),
                    color: index === activeIndex ? "button.contrastText" : "secondaryBackground.contrastText",
                    opacity: index === activeIndex ? 1 : 0.8,
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
        <Box
          className="home-landing-page-carousel-container"
          onClick={pauseAutoSlide}
          onMouseEnter={pauseAutoSlide}
          onMouseLeave={resumeAutoSlide}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              className="home-landing-page-carousel"
              key={activeIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                const swipeConfidenceThreshold = 5000;
                if (swipe < -swipeConfidenceThreshold) {
                  onNext();
                } else if (swipe > swipeConfidenceThreshold) {
                  onPrevious();
                }
              }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%"
              }}>
              <Box className="home-landing-page-carousel-text">
                <Typography className="home-landing-page-carousel-title">
                  {carouselContent[activeIndex].title}
                </Typography>
                <CustomDivider />
                <ul>
                  {carouselContent[activeIndex].bullets.map((bullet, index) => (
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
                  src={devSafeUrl(`/public/website-images/${carouselContent[activeIndex].image}`)}
                  alt={carouselContent[activeIndex].title}
                />
              </Box>
            </motion.div>
          </AnimatePresence>
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
              size={10}
              setActiveStep={jumpToIndex}
            />
          </Box>
        )}
      </Box>
    );
  })
);

export const LandingPageCards = observer(function LandingPageCards() {
  const [hoveredCard, setHoveredCard] = useState(-1);
  const { t } = useTranslation();
  const cards = [
    {
      title: t("landing-page.cards.datapack.title"),
      description: t("landing-page.cards.datapack.description"),
      icon: <FolderCopy />
    },
    {
      title: t("landing-page.cards.charts.title"),
      description: t("landing-page.cards.charts.description"),
      icon: <TableChart />
    },
    {
      title: t("landing-page.cards.help.title"),
      description: t("landing-page.cards.help.description"),
      icon: <HelpOutline />
    }
  ];
  return (
    <Box className="landing-page-cards">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          className="landing-page-card-container"
          initial={{ scale: 1 }}
          animate={{ scale: hoveredCard === index ? 1.02 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          onMouseEnter={() => setHoveredCard(index)}
          onMouseLeave={() => setHoveredCard(-1)}>
          <Box className="landing-page-card" sx={{ backgroundColor: "secondaryBackground.main" }}>
            <Box className="landing-page-card-icon">
              {cloneElement(card.icon, { className: "landing-page-card-icon-component" })}
            </Box>
            <Typography className="landing-page-card-title" variant="h4">
              {card.title}
            </Typography>
            <Divider
              sx={{
                width: "50%"
              }}
            />
            <Typography className="landing-page-card-description" variant="body1">
              {card.description}
            </Typography>
            <Box className="landing-page-card-see-more">
              <ChevronRight className="landing-page-card-arrow" />
              <Typography className="landing-page-card-see-more-text" variant="body1">
                {t("landing-page.cards.more")}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
});

const ChartCreationSteps = observer(function ChartCreationSteps() {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();
  const steps = [
    {
      title: t("landing-page.chart-steps.select-datapack.title"),
      description: t("landing-page.chart-steps.select-datapack.description"),
      icon: <FolderCopy />
    },
    {
      title: t("landing-page.chart-steps.select-age-range.title"),
      description: t("landing-page.chart-steps.select-age-range.description"),
      icon: <DateRange />
    },
    {
      title: t("landing-page.chart-steps.select-columns.title"),
      description: t("landing-page.chart-steps.select-columns.description"),
      icon: <Tune />
    },
    {
      title: t("landing-page.chart-steps.generate.title"),
      description: t("landing-page.chart-steps.generate.description"),
      icon: <RocketLaunch />
    }
  ];
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      position="relative"
      borderTop="1px solid black"
      borderBottom="1px solid black"
      sx={{
        backgroundColor: "secondaryBackground.main",
        padding: "50px 0",
        color: "secondaryBackground.contrastText"
      }}>
      <Box>
        <Typography className="chart-creation-title" variant="h3">
          {t("landing-page.chart-steps.title")}
        </Typography>
      </Box>
      {!isMobile && (
        <Box className="chart-creation-steps">
          <Box
            sx={{
              position: "absolute",
              top: "120px",
              left: "15%",
              right: "15%",
              height: "4px",
              background: gradient.dark,
              zIndex: 0
            }}></Box>
          {steps.map((step, index) => (
            <>
              <Box key={index} className="chart-creation-step">
                <Box className="chart-creation-step-icon-container" sx={{ background: gradient.dark }}>
                  {cloneElement(step.icon, {
                    className: "chart-creation-step-icon",
                    sx: { color: "button.contrastText" }
                  })}
                </Box>
                <Typography className="chart-creation-step-title" variant="h4">
                  {step.title}
                </Typography>
                <CustomDivider />
                <Typography className="chart-creation-step-description" variant="body1">
                  {step.description}
                </Typography>
              </Box>
              {index !== steps.length - 1 && (
                <Box className="chart-creation-step-arrow">
                  <East />
                </Box>
              )}
            </>
          ))}
        </Box>
      )}
      {isMobile && (
        <Box className="mobile-chart-creation-steps">
          <Box
            className="mobile-chart-creation-steps-line"
            sx={{
              background: gradient.dark
            }}></Box>
          {steps.map((step, index) => (
            <>
              <Box key={index} className="mobile-chart-creation-step">
                <Box className="mobile-chart-creation-step-icon-container" sx={{ background: gradient.dark }}>
                  {cloneElement(step.icon, {
                    className: "mobile-chart-creation-step-icon",
                    sx: { color: "button.contrastText" }
                  })}
                </Box>
                <Box className="mobile-chart-creation-step-text-container">
                  <Typography className="mobile-chart-creation-step-title" variant="h4">
                    {step.title}
                  </Typography>
                  <CustomDivider className="mobile-chart-creation-step-divider" />
                  <Typography className="mobile-chart-creation-step-description" variant="body1">
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            </>
          ))}
        </Box>
      )}
    </Box>
  );
});
