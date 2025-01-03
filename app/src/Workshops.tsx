import { observer } from "mobx-react-lite";
import React, { useContext, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Typography
} from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { context } from "./state";
import { StyledScrollbar } from "./components";
import "./Workshops.css";
import { useTheme } from "@mui/material/styles";
import {
  getActiveWorkshops,
  getNavigationRouteForWorkshopDetails,
  getPastWorkshops,
  getUpcomingWorkshops
} from "./state/non-action-util";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { NotLoggedIn } from "./NotLoggedIn";
import { Calendar as BigCalendar, CalendarProps, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// TODO: change this when implement the backend

export type Workshop = {
  title: string;
  start: string;
  end: string;
  workshopId: number;
  active: boolean;
  datapacks: string[];
  description: string;
  files: string[];
  imageLink: string;
};

// TODO: change this when implement the backend

const dummyWorkshops: Workshop[] = [
  // Active Workshops
  {
    title: "React Basics",
    start: "2024-12-20",
    end: "2025-01-30",
    workshopId: 1,
    active: true,
    datapacks: ["React Overview", "JSX Basics"],
    description:
      "This workshop introduces React concepts such as components, props, and state. Perfect for beginners looking to learn the basics of React.",
    files: ["ReactBasics.pdf", "example_code.mdpk"],
    imageLink: TSCreatorLogo
  },
  {
    title: "Advanced TypeScript",
    start: "2024-12-18",
    end: "2024-12-28",
    workshopId: 2,
    active: true,
    datapacks: ["Generics", "Decorators", "Type Inference"],
    description:
      "Dive deep into advanced TypeScript concepts like generics, decorators, and type inference. Ideal for developers with basic TypeScript knowledge.",
    files: ["AdvancedTypeScriptGuide.pdf", "examples.txt"],
    imageLink: TSCreatorLogo
  },
  // Upcoming Workshops
  {
    title: "Node.js for Beginners",
    start: "2025-01-01",
    end: "2025-01-10",
    workshopId: 3,
    active: false,
    datapacks: ["Node Basics", "Express.js Overview"],
    description:
      "Learn the fundamentals of Node.js, including setting up a server and building simple RESTful APIs using Express.js.",
    files: ["NodeIntro.pdf", "starter_code.mdpk"],
    imageLink: TSCreatorLogo
  },
  {
    title: "Fullstack Development",
    start: "2025-01-05",
    end: "2025-01-15",
    workshopId: 4,
    active: false,
    datapacks: ["Frontend-Backend Integration", "API Design"],
    description:
      "A comprehensive workshop on integrating frontend and backend technologies to build fullstack applications, including best practices for API design.",
    files: ["FullstackDevelopment.pdf", "sample_project.txt"],
    imageLink: TSCreatorLogo
  },
  // Expired Workshops
  {
    title: "CSS in Depth",
    start: "2024-12-01",
    end: "2024-12-10",
    workshopId: 5,
    active: false,
    datapacks: ["Flexbox", "Grid Layout", "Animations"],
    description:
      "Master advanced CSS techniques, including Flexbox, Grid, and creating smooth animations for modern web designs.",
    files: ["CSSInDepth.pdf", "examples.mpdk"],
    imageLink: TSCreatorLogo
  },
  {
    title: "Python for Data Science",
    start: "2024-11-15",
    end: "2024-11-25",
    workshopId: 6,
    active: false,
    datapacks: ["Pandas", "NumPy", "Matplotlib"],
    description:
      "An introductory workshop on data analysis and visualization using Python libraries like Pandas, NumPy, and Matplotlib.",
    files: ["PythonDataScience.pdf", "datasets.txt"],
    imageLink: TSCreatorLogo
  }
];

type WorkshopsCategoryProps = {
  workshops: Workshop[];
  noDataMessage: string;
  onClickHandler: (workshop: Workshop) => void;
};

const WorkshopsCategory: React.FC<WorkshopsCategoryProps> = ({ workshops, noDataMessage, onClickHandler }) => {
  const { t } = useTranslation();
  return (
    <StyledScrollbar>
      <Box sx={{ display: "flex", padding: "5px 5px" }}>
        {workshops.length > 0 ? (
          workshops.map((workshop) => (
            <Grid item key={workshop.workshopId} sx={{ padding: "0px 10px" }}>
              <Card
                sx={{
                  outline: "1px solid",
                  outlineColor: "divider",
                  bgcolor: "secondaryBackground.main"
                }}
                className="workshop-card"
                onClick={() => onClickHandler(workshop)}>
                <CardContent>
                  <CardMedia
                    component="img"
                    height="140"
                    image={workshop.imageLink}
                    alt={workshop.title}
                    sx={{ objectFit: "cover" }}
                  />
                  <Typography variant="h5" component="div" gutterBottom>
                    {workshop.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t("workshops.dates.start")}
                    {workshop.start}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t("workshops.dates.end")}
                    {workshop.end}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography className="no-data-message">{t(`workshops.messages.${noDataMessage}`)}</Typography>
        )}
      </Box>
    </StyledScrollbar>
  );
};

export const Workshops: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const activeWorkshops = getActiveWorkshops(dummyWorkshops);
  const upcomingWorkshops = getUpcomingWorkshops(dummyWorkshops);
  const pastWorkshops = getPastWorkshops(dummyWorkshops);

  // TODO: change this when implement the backend
  function setWorkshopAndNavigate(event: { title: string }) {
    const workshop = dummyWorkshops.find(w => w.title === event.title);
    if (workshop) {
      navigate(getNavigationRouteForWorkshopDetails(workshop.workshopId));
    }
  }

  const localizer = momentLocalizer(moment);
  function Calendar(props: Omit<CalendarProps, "localizer">) {
    return (
      <BigCalendar
      localizer={localizer}
      {...props}
      onSelectEvent={(event) => setWorkshopAndNavigate(event as { title: string })}
      eventPropGetter={(event) => {
        let newStyle = {
        backgroundColor: "lightgrey",
        color: 'black',
        borderRadius: "0px",
        border: "none"
        };

        // Past workshops
        if (event.start && event.end && event.start < new Date() && event.end < new Date()) {
        newStyle.backgroundColor = "#faf3dd";
        } 
        // Upcoming workshops
        else if (event.start && event.start > new Date()) {
        newStyle.backgroundColor = "#c8d5b9";
        } 
        // Active workshops
        else {
        newStyle.backgroundColor = "#8fc0a9";
        }
        return {
        className: "",
        style: newStyle
        };
      }}
      />
    );
  }

  const events = [...activeWorkshops, ...upcomingWorkshops, ...pastWorkshops]
  .map((workshop) => ({
    title: workshop.title,
    start: new Date(workshop.start),
    end: new Date(workshop.end),
  }));

  useEffect(() => {
    actions.setWorkshopsArray(dummyWorkshops);
  }, []);
  return (
    <>
      {state.isLoggedIn ? (
        <Box padding={4}>
          <Typography className="header">{t("workshops.header")}</Typography>
          <Calendar events={events} views={["month"]}/>
          <Typography className="description-header" sx={{ marginBottom: 1 }}>
            {t("workshops.description-header")}
          </Typography>

          {/* Active Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="active-workshops-content"
              className="workshops-summary">
              <Typography>{t("workshops.titles.active")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <WorkshopsCategory
                workshops={activeWorkshops}
                noDataMessage="active"
                onClickHandler={setWorkshopAndNavigate}
              />
            </AccordionDetails>
          </Accordion>

          {/* Upcoming Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="upcoming-workshops-content"
              className="workshops-summary">
              <Typography>{t("workshops.titles.upcoming")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <WorkshopsCategory
                workshops={upcomingWorkshops}
                noDataMessage="upcoming"
                onClickHandler={setWorkshopAndNavigate}
              />
            </AccordionDetails>
          </Accordion>

          {/* Expired Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="expired-workshops-content"
              className="workshops-summary">
              <Typography>{t("workshops.titles.past")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <WorkshopsCategory
                workshops={pastWorkshops}
                noDataMessage="past"
                onClickHandler={setWorkshopAndNavigate}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        <NotLoggedIn />
      )}
    </>
  );
});
