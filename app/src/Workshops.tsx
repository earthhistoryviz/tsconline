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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CalendarViewMonthIcon from "@mui/icons-material/CalendarViewMonth";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import { actions, context } from "./state";
import { StyledScrollbar } from "./components";
import "./Workshops.css";
import { useTheme } from "@mui/material/styles";
import {
  getActiveWorkshops,
  getNavigationRouteForWorkshopDetails,
  getPastWorkshops,
  getUpcomingWorkshops,
  getWorkshopCoverImage
} from "./state/non-action-util";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
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
import { SharedWorkshop } from "@tsconline/shared";
import { ErrorCodes } from "./util/error-codes";

type WorkshopsCategoryProps = {
  workshops: SharedWorkshop[];
  noDataMessage: string;
  imageSize: number;
  includeTime: boolean;
  onClickHandler: (workshop: SharedWorkshop) => void;
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
                    image={getWorkshopCoverImage()}
                    alt={workshop.title}
                    sx={{ objectFit: "cover" }}
                    onError={() => actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE)}
                  />
                  <Typography variant="h5" component="div" gutterBottom>
                    {workshop.title}
                  </Typography>
                  {includeTime && (
                    <>
                      <Typography variant="body2" color="textSecondary" fontSize="0.85rem">
                        {t("workshops.dates.start")} {dayjs(workshop.start).format("MMMM D, YYYY h:mm A")}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" fontSize="0.85rem">
                        {t("workshops.dates.end")} {dayjs(workshop.end).format("MMMM D, YYYY h:mm A")}
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
  const { state } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const activeWorkshops = getActiveWorkshops(state.workshops);
  const upcomingWorkshops = getUpcomingWorkshops(state.workshops);
  const pastWorkshops = getPastWorkshops(state.workshops);

  const [calendarWorkshopFilter, setCalendarWorkshopFilter] = useState("All");
  const [calendarView, setCalendarView] = useState(() => (window.innerWidth < 500 ? "day" : "month"));
  //calendar default off unless an event is a week away
  const [calendarState, setCalendarState] = useState(() => {
    const oneWeekFromNow = dayjs().add(1, "week");
    const now = dayjs();
    return state.workshops.some((workshop) => {
      const startDate = dayjs(workshop.start);
      const endDate = dayjs(workshop.end);
      return (
        (startDate.isAfter(now) && startDate.isBefore(oneWeekFromNow)) ||
        (endDate.isAfter(now) && endDate.isBefore(oneWeekFromNow))
      );
    });
  });

  //Use day view with smaller screen sizes
  useEffect(() => {
    const handleResize = () => {
      setCalendarView((prevView) => (window.innerWidth < 450 ? "day" : prevView === "day" ? "month" : prevView));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function setWorkshopAndNavigateForCalendar(event: { workshopId: number }) {
    navigate(getNavigationRouteForWorkshopDetails(event.workshopId));
  }

  function setWorkshopAndNavigate(workshop: SharedWorkshop) {
    navigate(getNavigationRouteForWorkshopDetails(workshop.workshopId));
  }

  const localizer = dayjsLocalizer(dayjs);

  const CustomToolbar: React.FC<ToolbarProps> = ({ label, onNavigate }) => {
    const getLabel = () => {
      const parts = label.split(" ");
      const monthIndex = new Date(`${parts[0]} 1, ${parts[parts.length - 1]}`).getMonth() + 1;

      if (calendarView === "month") {
        return `${t(`workshops.calendar.months.${monthIndex}`)} ${parts[1]}`;
      } else if (calendarView === "week") {
        const [startDay, endDay] = parts.length === 5 ? [parts[1], parts[4]] : [parts[1], parts[3]];
        const endMonthIndex = parts.length === 5 ? new Date(`${parts[3]} 1, ${parts[4]}`).getMonth() + 1 : monthIndex;
        return `${t(`workshops.calendar.months.${monthIndex}`)} ${startDay} - ${t(`workshops.calendar.months.${endMonthIndex}`)} ${endDay}`;
      } else {
        return `${t(`workshops.calendar.days.${parts[0].toLowerCase()}`)}, ${t(`workshops.calendar.months.${monthIndex}`)} ${parts[2]}`;
      }
    };

    return (
      <Box className="calendar-toolbar" sx={{ flexDirection: { xs: "column", md: "row" } }}>
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
    const overlappingEvent = !events.every(
      (e) =>
        !(
          dayjs(e.start).toDate() &&
          dayjs(e.end).toDate() &&
          event.start &&
          event.end &&
          new Date(e.start) <= new Date(event.end) &&
          new Date(e.end) >= new Date(event.start)
        )
    );

    const longEvent = dayjs(event.end).diff(dayjs(event.start), "day") > 0;

    const longOverlappingEvent = longEvent && overlappingEvent;

    return (
      <Card
        className="rbc-custom-event"
        sx={{
          justifyContent: calendarView !== "month" && !longEvent ? "center" : "flex-start",
          bgcolor: theme.palette.button.main,
          "&:hover": { backgroundColor: theme.palette.button.dark },
          height: overlappingEvent || (calendarView !== "month" && longEvent) ? "auto" : "140%",
          flexDirection: longOverlappingEvent || (calendarView !== "month" && longEvent) ? "row" : "column",
          alignItems: calendarView === "week" ? "center" : "flex-start",
          marginTop: calendarView === "week" && longEvent ? "4px" : "0",
          display: "flex",
          //Fits events when in week and day view
          ...(calendarView !== "month" &&
            !longEvent && {
              marginTop: `${(new Date(event.start!).getHours() - 9) * 40 + new Date(event.start!).getMinutes()}px`,
              height: `${((new Date(event.end!).getTime() - new Date(event.start!).getTime()) / (1000 * 30 * 60)) * 20}px`
            })
        }}
        onClick={() => setWorkshopAndNavigateForCalendar(event as { workshopId: number })}>
        {/* timing details on card */}
        <Typography className="custom-event-label">{event.title}</Typography>
        {(!overlappingEvent || longOverlappingEvent || calendarView === "week" || calendarView === "day") && (
          <Typography
            className="custom-event-label"
            sx={{
              marginLeft: longOverlappingEvent || longEvent ? "4px" : "0"
            }}>
            {new Date(event.start!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {((calendarView !== "month" && !longEvent) || calendarView === "month") && (
              <>- {new Date(event.end!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
            )}
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
      newStyle.backgroundImage = getWorkshopCoverImage(); // This need to be fix later so leave it as TSCreatorLogo for now.
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
      onView={(view) => setCalendarView(view)}
      view={calendarView as (typeof Views)[keyof typeof Views]}
      components={{ toolbar: CustomToolbar, eventWrapper: EventWrapper }}
      onSelectEvent={(event) => setWorkshopAndNavigateForCalendar(event as { workshopId: number })}
      dayPropGetter={(date) => dayPropGetter(date, events)}
    />
  );

  const events: Event[] = [
    ...(calendarWorkshopFilter === "All"
      ? state.workshops
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

  return (
    <>
      <Box padding={4}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ width: "200px" }}></Box>
          <Typography className="header" sx={{ textAlign: "center" }}>
            {t("workshops.header")}
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
            sx={{ marginLeft: 2 }}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <Typography className="description-header">{t("workshops.description-header")}</Typography>
        </Box>
        {calendarState && <Calendar events={events} views={["month", "week", "day"]} />}

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
    </>
  );
});
