import { TableCell, TableBody, TableContainer, Paper, SvgIcon, Typography, Box, IconButton } from "@mui/material";
import React, { useContext } from "react";
import { Table } from "react-bootstrap";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import { CustomTooltip, StyledScrollbar } from "../components";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ErrorOutline } from "@mui/icons-material";
import NotesIcon from "@mui/icons-material/Notes";
import { useTheme } from "@mui/material/styles";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import { trimQuotes } from "../util/util";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MobiledataOffIcon from "@mui/icons-material/MobiledataOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import BrowserNotSupportedIcon from "@mui/icons-material/BrowserNotSupported";

import "./Results.css";

const tooltipDelayTime = 700;

const Status = observer(({ info }: { info: EventSearchInfo }) => {
  const { state } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const ColumnPathToRootOn = () => {
    let currColumn = column!;
    while (currColumn.parent) {
      if (currColumn.on === false) {
        return false;
      }
      const parent = state.settingsTabs.columnHashMap.get(currColumn.parent);
      if (!parent) {
        console.error("parent of " + currColumn.name + "not found");
        return false;
      }
      currColumn = parent;
    }
    return true;
  };
  const isAgeWithinTimeInterval = () => {
    const { state } = useContext(context);
    if (!(info.unit in state.settings.timeSettings)) {
      console.error(info.unit + "not in time settings");
      return false;
    }
    const chartTopAge = state.settings.timeSettings[info.unit].topStageAge;
    const chartBaseAge = state.settings.timeSettings[info.unit].baseStageAge;
    const ages = info.age;
    if (!ages) return true;
    if (ages.topAge >= chartTopAge && ages.baseAge <= chartBaseAge) {
      return true;
    }
    return false;
  };
  if (!info.age) {
    return (
      <div>
        {ColumnPathToRootOn() ? (
          <CustomTooltip
            enterDelay={tooltipDelayTime}
            enterNextDelay={tooltipDelayTime}
            disableInteractive
            title="Column Toggled ON">
            <DoneAllIcon color="success" />
          </CustomTooltip>
        ) : (
          <CustomTooltip
            enterDelay={tooltipDelayTime}
            enterNextDelay={tooltipDelayTime}
            disableInteractive
            title="Column Toggled OFF">
            <CloseIcon color="error" />
          </CustomTooltip>
        )}
      </div>
    );
  }
  return (
    <div>
      {ColumnPathToRootOn() ? (
        isAgeWithinTimeInterval() ? (
          <CustomTooltip
            enterDelay={tooltipDelayTime}
            enterNextDelay={tooltipDelayTime}
            disableInteractive
            title="Column Toggled ON, age within time interval">
            <DoneAllIcon color="success" />
          </CustomTooltip>
        ) : (
          <CustomTooltip
            enterDelay={tooltipDelayTime}
            enterNextDelay={tooltipDelayTime}
            disableInteractive
            title="Column Toggled ON, age not within time interval">
            <MobiledataOffIcon sx={{ color: "orange" }} />
          </CustomTooltip>
        )
      ) : isAgeWithinTimeInterval() ? (
        <CustomTooltip
          enterDelay={tooltipDelayTime}
          enterNextDelay={tooltipDelayTime}
          disableInteractive
          title="Column Toggled OFF, age within time interval">
          <BrowserNotSupportedIcon sx={{ color: "orange" }} />
        </CustomTooltip>
      ) : (
        <CustomTooltip
          enterDelay={tooltipDelayTime}
          enterNextDelay={tooltipDelayTime}
          disableInteractive
          title="Column Toggled OFF, age not within time interval">
          <CloseIcon color="error" />
        </CustomTooltip>
      )}
    </div>
  );
});

const Column = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const { columnName, columnPath } = info;
  const column = state.settingsTabs.columnHashMap.get(columnName);

  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  return (
    <>
      <div
        className="search-result-column-container"
        onClick={() => {
          actions.toggleSettingsTabColumn(column);
        }}>
        <CustomTooltip
          enterDelay={tooltipDelayTime}
          enterNextDelay={tooltipDelayTime}
          placement="bottom"
          title={columnPath.map((value, pathIndex) => (
            <div key={pathIndex}>{value}</div>
          ))}>
          <Typography noWrap variant="subtitle2">
            {columnPath[0]}
          </Typography>
        </CustomTooltip>
      </div>
    </>
  );
});

const verifyAgesAndAddAgeMargin = (age: { topAge: number; baseAge: number } | undefined) => {
  if (!age) return null;
  let { topAge, baseAge } = age;
  if ((topAge -= 3) < 0) {
    topAge = 0;
  }
  if ((baseAge += 3) < 0) {
    baseAge = 0;
  }
  return { topAge: topAge, baseAge: baseAge };
};

const truncToSecondDecimal = (num: number) => {
  return Math.trunc(num * 100) / 100;
};

const Center = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const centerTimeOnEvent = () => {
    const ages = verifyAgesAndAddAgeMargin(info.age);
    if (!ages) return;
    actions.setTopStageAge(truncToSecondDecimal(ages.topAge), info.unit);
    actions.setBaseStageAge(truncToSecondDecimal(ages.baseAge), info.unit);
  };
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      disableInteractive
      title="center time interval on event">
      <IconButton
        onClick={() => {
          centerTimeOnEvent();
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
        }}>
        <VerticalAlignCenterIcon color="info" />
      </IconButton>
    </CustomTooltip>
  );
});

const Extend = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const extendTimeToIncludeEvent = () => {
    const ages = verifyAgesAndAddAgeMargin(info.age);
    if (!ages) return;
    if (state.settings.timeSettings[info.unit].topStageAge > ages.topAge) {
      actions.setTopStageAge(truncToSecondDecimal(ages.topAge), info.unit);
    }
    if (state.settings.timeSettings[info.unit].baseStageAge < ages.baseAge) {
      actions.setBaseStageAge(truncToSecondDecimal(ages.baseAge), info.unit);
    }
  };
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      disableInteractive
      title="extend time interval to include event">
      <IconButton
        onClick={() => {
          extendTimeToIncludeEvent();
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
        }}>
        <FormatLineSpacingIcon color="info" />
      </IconButton>
    </CustomTooltip>
  );
});

const Age = observer(({ info }: { info: EventSearchInfo }) => {
  const { state } = useContext(context);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }

  const AgeDisplay = () => {
    if (!info.age)
      return (
        <SvgIcon>
          <ErrorOutline />
        </SvgIcon>
      );
    if (info.age.topAge === info.age.baseAge) {
      return <div>{info.age.topAge}</div>;
    }
    return (
      <div>
        {info.age.topAge} - {info.age.baseAge}
      </div>
    );
  };
  return <AgeDisplay />;
});

const Qualifier = observer(({ info }: { info: EventSearchInfo }) => {
  if (!info.qualifier) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }
  return <div>{info.qualifier}</div>;
});

const Notes = observer(({ info }: { info: EventSearchInfo }) => {
  if (!info.notes) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      title={
        <Box className="search-result-info-container">
          <StyledScrollbar className="scroll-bar">
            <Box
              className="search-result-info"
              sx={{ "& a": { color: "button.main" } }}
              dangerouslySetInnerHTML={{ __html: trimQuotes(info.notes).replaceAll('""', '"') }}
            />
          </StyledScrollbar>
        </Box>
      }>
      <SvgIcon>
        <NotesIcon />
      </SvgIcon>
    </CustomTooltip>
  );
});

export const Results = ({ groupedEvents }: { groupedEvents: GroupedEventSearchInfo[] }) => {
  const theme = useTheme();
  //this is necessary to prevent table hierachy errors
  //virtuoso assigns each array element to a table row, and a table row can't be a child
  //of a table row which would be necessary for display without stretching the array.
  const stretchedEvents: (string | EventSearchInfo)[] = [];
  groupedEvents.map((value) => {
    stretchedEvents.push(value.key);
    stretchedEvents.push("subheader");
    for (const event of value.info) {
      stretchedEvents.push(event);
    }
  });

  function EventGroup(index: number, info: string | EventSearchInfo) {
    if (info === "subheader") {
      return (
        <>
          <TableCell className="event-group-header-text search-result-status-column" align="left">
            Status
          </TableCell>
          <TableCell className="event-group-header-text search-result-column-column" align="left">
            Column
          </TableCell>
          <TableCell className="event-group-header-text search-result-center-column" align="center">
            Center
          </TableCell>
          <TableCell className="event-group-header-text search-result-extend-column" align="center">
            Extend
          </TableCell>
          <TableCell className="event-group-header-text search-result-age-column" align="center">
            Age
          </TableCell>
          <TableCell className="event-group-header-text search-result-qualifier-column" align="center">
            Qualifier
          </TableCell>
          <TableCell className="event-group-header-text search-result-notes-column" align="right">
            Notes
          </TableCell>
        </>
      );
    } else if (typeof info === "string") {
      return (
        <TableCell
          className="event-group-identifier"
          align="center"
          sx={{ backgroundColor: theme.palette.secondaryBackground.main }}
          colSpan={7}>
          <Typography variant="h6">
            <Box className="event-group-identifier-text">{info}</Box>
          </Typography>
        </TableCell>
      );
    } else {
      return (
        <>
          <TableCell className="search-result-status-column" align="left">
            <Status info={info} />
          </TableCell>
          <TableCell className="search-result-column-column" align="left">
            <Column info={info} />
          </TableCell>
          <TableCell className="search-result-center-column" align="center">
            <Center info={info} />
          </TableCell>
          <TableCell className="search-result-extend-column" align="center">
            <Extend info={info} />
          </TableCell>
          <TableCell className="search-result-age-column" align="center">
            <Age info={info} />
          </TableCell>
          <TableCell className="search-result-qualifier-column" align="center">
            <Qualifier info={info} />
          </TableCell>
          <TableCell className="search-result-notes-column" align="right">
            <Notes info={info} />
          </TableCell>
        </>
      );
    }
  }

  const VirtuosoTableComponents: TableComponents<string | EventSearchInfo> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer
        component={Paper}
        sx={{ backgroundColor: theme.palette.backgroundColor.main }}
        {...props}
        ref={ref}
      />
    )),
    Table: (props) => <Table {...props} style={{ width: "100%", borderSpacing: "0px" }} />,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => <TableBody {...props} ref={ref} />)
  };

  //add display names for linter
  if (!VirtuosoTableComponents.Scroller || !VirtuosoTableComponents.TableBody) return;
  VirtuosoTableComponents.Scroller.displayName = "Scroller";
  VirtuosoTableComponents.TableBody.displayName = "TableBody";

  return (
    <Box className="table-container" id="event-search-results-table">
      <CustomTooltip
        title={
          <>
            Center: sets the time interval to the selected age surrounded with 3myr
            <br />
            Extend: takes the smallest top age and greatest base age between the current time interval and the selected
            age surrounded with 3myr
          </>
        }>
        <HelpOutlineIcon />
      </CustomTooltip>
      <TableVirtuoso
        className="events-search-results-table"
        data={stretchedEvents}
        components={VirtuosoTableComponents}
        itemContent={EventGroup}
      />
    </Box>
  );
};
