import { observer } from "mobx-react-lite";
import React, { useState, useContext, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  MenuItem,
  Typography,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch
} from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CalendarViewMonthIcon from "@mui/icons-material/CalendarViewMonth";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
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
import {
  Calendar as BigCalendar,
  CalendarProps,
  dayjsLocalizer,
  ToolbarProps,
  Views,
  EventWrapperProps
} from "react-big-calendar";
import { SelectChangeEvent } from "@mui/material/Select";
import dayjs from "dayjs";
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
    start: "2025-01-14T09:00:00",
    end: "2025-01-17T18:00:00",
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
    start: "2025-01-14T09:00:00",
    end: "2025-01-16T16:00:00",
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
    start: "2025-01-20T09:00:00",
    end: "2025-01-21T12:00:00",
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
    start: "2025-02-17T13:00:00",
    end: "2025-02-18T16:00:00",
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
    start: "2024-12-03T09:00:00",
    end: "2024-12-03T18:00:00",
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
    start: "2025-01-01T10:00:00",
    end: "2025-01-01T13:00:00",
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
  imageSize: number;
  includeTime: boolean;
  onClickHandler: (workshop: Workshop) => void;
};

type Event = {
  title: string;
  start: Date;
  end: Date;
  workshopId: number;
};

const WorkshopsCategory: React.FC<WorkshopsCategoryProps> = ({
  workshops,
  noDataMessage,
  imageSize,
  includeTime,
  onClickHandler
}) => {
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
                  bgcolor: "secondaryBackground.main",
                  height: `${imageSize + 100 + (includeTime ? 50 : 0)}px`
                }}
                className="workshop-card"
                onClick={() => onClickHandler(workshop)}>
                <CardContent>
                  <CardMedia
                    component="img"
                    height={imageSize}
                    image={workshop.imageLink}
                    alt={workshop.title}
                    sx={{ objectFit: "cover" }}
                  />
                  <Typography variant="h5" component="div" gutterBottom>
                    {workshop.title}
                  </Typography>
                  {includeTime && (
                    <>
                      <Typography variant="body2" color="textSecondary">
                        {t("workshops.dates.start")} {workshop.start}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {t("workshops.dates.end")} {workshop.end}
                      </Typography>
                    </>
                  )}
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

  const [calendarWorkshopFilter, setCalendarWorkshopFilter] = useState("All");
  const [calendarView, setCalendarView] = useState(() => (window.innerWidth < 600 ? "day" : "month"));
  //calendar default off unless an event is a week away
  const [calendarState, setCalendarState] = useState(() => {
    const oneWeekFromNow = dayjs().add(1, "week");
    return dummyWorkshops.some(
      (workshop) => dayjs(workshop.start).isBefore(oneWeekFromNow) && dayjs(workshop.start).isAfter(dayjs())
    );
  });

  //Use day view with smaller screen sizes
  useEffect(() => {
    const handleResize = () => {
      setCalendarView(window.innerWidth < 600 ? "day" : "month");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const setWorkshopAndNavigate = (event: { workshopId: number }) => {
    const workshop = dummyWorkshops.find((w) => w.workshopId === event.workshopId);
    if (workshop) {
      navigate(getNavigationRouteForWorkshopDetails(workshop.workshopId));
    }
  };

  const localizer = dayjsLocalizer(dayjs);

  const CustomToolbar: React.FC<ToolbarProps> = ({ label, onNavigate }) => {
    const getLabel = () => {
      const [month, year] = label.split(" ");
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth() + 1;
      return calendarView === "month"
        ? `${t(`workshops.calendar.months.${monthIndex}`)} ${year}`
        : calendarView === "week"
          ? `${t(`workshops.calendar.months.${monthIndex}`)} ${label.split(" ")[1]} - ${label.split(" ")[3]}`
          : `${t(`workshops.calendar.days.${label.split(" ")[0].toLowerCase()}`)}, ${t(`workshops.calendar.months.${monthIndex}`)} ${label.split(" ")[2]}`;
    };

    return (
      <Box
        className="calendar-toolbar"
        sx={{ display: "flex", alignItems: "center", flexDirection: { xs: "column", md: "row" } }}>
        <Box className="calendar-toolbar-navigation">
          <IconButton onClick={() => onNavigate("PREV")}>
            <KeyboardArrowLeftIcon sx={{ color: "button.light" }} />
          </IconButton>
          <Typography sx={{ textAlign: "center", margin: "0 16px", minWidth: "120px" }}>{getLabel()}</Typography>
          <IconButton onClick={() => onNavigate("NEXT")}>
            <KeyboardArrowRightIcon sx={{ color: "button.light" }} />
          </IconButton>
        </Box>
        <Box
          className="calendar-toolbar-customization"
          sx={{
            justifyContent: { xs: "center", md: "flex-end" },
            flexDirection: { xs: "column", md: "row" }
          }}>
          <Select
            value={calendarWorkshopFilter}
            onChange={(event: SelectChangeEvent) => {
              event.stopPropagation();
              setCalendarWorkshopFilter(event.target.value as string);
            }}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: 0 },
              "&:hover": { backgroundColor: theme.palette.action.hover },
              minWidth: "150px",
              borderRadius: "4px"
            }}>
            <MenuItem value="All">{t("workshops.titles.all")}</MenuItem>
            <MenuItem value="Past">{t("workshops.titles.past")}</MenuItem>
            <MenuItem value="Active">{t("workshops.titles.active")}</MenuItem>
            <MenuItem value="Upcoming">{t("workshops.titles.upcoming")}</MenuItem>
          </Select>
          <ToggleButtonGroup
            value={calendarView}
            exclusive
            onChange={(_, value: string) => value !== null && setCalendarView(value)}
            sx={{ display: { xs: "none", sm: "flex" } }}>
            <ToggleButton value="month" sx={{ padding: "0 8px", width: 40 }}>
              <CalendarViewMonthIcon />
            </ToggleButton>
            <ToggleButton value="week" sx={{ padding: "0 8px", width: 40 }}>
              <CalendarViewWeekIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    );
  };

  const EventWrapper: React.FC<EventWrapperProps> = ({ event }) => {
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.backgroundColor = theme.palette.button.dark;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.backgroundColor = theme.palette.button.main;
    };

    const overlappingEvent = !events.every(
      (e) =>
        e === event ||
        !(e.start && e.end && new Date(e.start!) <= new Date(event.end!) && new Date(e.end!) >= new Date(event.start!))
    );

    const longOverlappingEvent = dayjs(event.end).diff(dayjs(event.start), "day") > 0 && overlappingEvent;

    return (
      <Card
        className="rbc-custom-event"
        sx={{
          bgcolor: theme.palette.button.main,
          "&:hover": { backgroundColor: theme.palette.button.dark },
          height: overlappingEvent ? "auto" : "150%",
          flexDirection: longOverlappingEvent ? "row" : "column",
          //Fits events when in week and day view
          ...(calendarView !== "month" && {
            marginTop: `${(new Date(event.start!).getHours() - 9) * 40 + new Date(event.start!).getMinutes()}px`,
            height: `${((new Date(event.end!).getTime() - new Date(event.start!).getTime()) / (1000 * 30 * 60)) * 20}px`
          })
        }}
        onClick={() => setWorkshopAndNavigate(event as { workshopId: number })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        {/* timing details on card */}
        <Typography sx={{ fontSize: ".85rem" }}>{event.title}</Typography>
        {(!overlappingEvent || longOverlappingEvent || calendarView === "week" || calendarView === "day") && (
          <Typography
            sx={{
              fontSize: ".75rem",
              marginLeft: longOverlappingEvent ? "4px" : "0"
            }}>
            {new Date(event.start!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
            {new Date(event.end!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Typography>
        )}
      </Card>
    );
  };

  // Fits custome calendar background
  const dayPropGetter = (date: Date, events: Event[]) => {
    const newStyle: React.CSSProperties = {
      border: `1px solid ${theme.palette.accordionLine}`,
      backgroundColor: theme.palette.secondaryBackground.main,
      borderRadius: "0px"
    };
    if (date.toDateString() === new Date().toDateString()) {
      newStyle.backgroundColor = theme.palette.calendarCurrentDay.main;
    }
    if (
      calendarView === "month" &&
      events.some(
        (event) =>
          new Date(event.start).toDateString() === date.toDateString() ||
          (new Date(event.start) < date && new Date(event.end) >= date)
      )
    ) {
      newStyle.backgroundImage = `url(${dummyWorkshops.find((workshop) => new Date(workshop.start).toDateString() === date.toDateString() || (new Date(workshop.start) < date && new Date(workshop.end) >= date))?.imageLink})`;
      newStyle.backgroundSize = "cover";
      newStyle.backgroundPosition = "center";
      newStyle.opacity = 0.3;
    }
    if (date.getMonth() !== new Date().getMonth()) {
      newStyle.backgroundColor = theme.palette.backgroundColor.main;
    }
    return { className: "", style: newStyle };
  };

  const Calendar: React.FC<Omit<CalendarProps, "localizer">> = (props) => (
    <BigCalendar
      min={new Date(new Date().setHours(9, 0, 0, 0))}
      max={new Date(new Date().setHours(18, 0, 0, 0))}
      localizer={localizer}
      {...props}
      startAccessor="start"
      endAccessor="end"
      view={calendarView as (typeof Views)[keyof typeof Views]}
      components={{ toolbar: CustomToolbar, eventWrapper: EventWrapper }}
      onSelectEvent={(event) => setWorkshopAndNavigate(event as { workshopId: number })}
      dayPropGetter={(date) => dayPropGetter(date, events)}
    />
  );

  //Standard event list for month view
  const events = [
    ...(calendarWorkshopFilter === "All"
      ? dummyWorkshops
      : calendarWorkshopFilter === "Active"
        ? activeWorkshops
        : calendarWorkshopFilter === "Upcoming"
          ? upcomingWorkshops
          : pastWorkshops)
  ].map((workshop) => ({
    title: workshop.title,
    start: dayjs(workshop.start).toDate(),
    end: dayjs(workshop.end).toDate(),
    workshopId: workshop.workshopId
  }));

  //Seperate event list stretching multi day events for week view as react-big-calendar does not support multi day events
  //Splits multi day events into individual day events with the same details
  const weekAndDayEvents = events.flatMap((event) => {
    const days = [];
    let current = dayjs(event.start);
    const end = dayjs(event.end);
    const startTime = dayjs(event.start).format("HH:mm");
    const endTime = dayjs(event.end).format("HH:mm");

    while (current.isBefore(end) || current.isSame(end, "day")) {
      days.push({
        ...event,
        start: current.isSame(event.start, "day")
          ? event.start
          : dayjs(current.format("YYYY-MM-DD") + " " + startTime).toDate(),
        end: current.isSame(event.end, "day") ? event.end : dayjs(current.format("YYYY-MM-DD") + " " + endTime).toDate()
      });
      current = current.add(1, "day").startOf("day");
    }

    return days;
  });

  useEffect(() => {
    actions.setWorkshopsArray(dummyWorkshops);
  }, []);
  return (
    <>
      {state.isLoggedIn ? (
        <Box padding={4}>
          <Typography className="header" sx={{ textAlign: "center" }}>
            {t("workshops.header")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Typography className="description-header" sx={{}}>
              {t("workshops.description-header")}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  color="default"
                  checked={calendarState}
                  onClick={() => setCalendarState((prevState) => !prevState)}
                />
              }
              label={t("workshops.calendar.switchLabel")}
            />
          </Box>
          {calendarState && (
            <Calendar events={calendarView === "month" ? events : weekAndDayEvents} views={["month", "week", "day"]} />
          )}

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
                imageSize={140}
                includeTime={true}
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
                imageSize={140}
                includeTime={true}
                onClickHandler={setWorkshopAndNavigate}
              />
            </AccordionDetails>
          </Accordion>

          {/* Expired Workshops */}
          <Accordion
            defaultExpanded={false}
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
                imageSize={80}
                includeTime={false}
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
