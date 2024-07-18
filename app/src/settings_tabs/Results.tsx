import { TableCell, TableBody, TableContainer, Paper, SvgIcon, Typography, Box, IconButton } from "@mui/material";
import React, { useContext, useEffect } from "react";
import { Table } from "react-bootstrap";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import { CustomTooltip, StyledScrollbar } from "../components";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ErrorOutline } from "@mui/icons-material";
import NotesIcon from "@mui/icons-material/Notes";
import { useTheme } from "@mui/material/styles";
import "./Results.css";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { trimQuotes } from "../util/util";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const isAgeWithinTimeInterval = (info: EventSearchInfo) => {
  const { state } = useContext(context);
  if (!(info.unit in state.settings.timeSettings)) {
    console.error(info.unit + "not in time settings");
    return false;
  }
  const chartTopAge = state.settings.timeSettings[info.unit].topStageAge;
  const chartBaseAge = state.settings.timeSettings[info.unit].baseStageAge;
  const ages = info.age;
  if (!ages) return false;
  if (ages.topAge >= chartTopAge && ages.baseAge <= chartBaseAge) {
    return true;
  }
  return false;
};

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

  useEffect(() => {
    const table = document.getElementById("event-search-results-table");
    if (!table) return;
    //dynamically change column path width on resize of table
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = (entry.contentRect.right - entry.contentRect.left) / 3.5;
        const columns = document.getElementsByClassName("search-result-column-container");
        for (const column of columns) {
          const columnCell = column.parentElement;
          if (!columnCell) return;
          columnCell.style.width = width + "px";
        }
      }
    });
    resize.observe(table!);
    return () => {
      resize.disconnect();
    };
  }, []);

  return (
    <>
      <div
        className="search-result-column-container"
        onClick={() => {
          actions.toggleSettingsTabColumn(column);
        }}>
        <div style={{ marginRight: "1vw" }}>
          {ColumnPathToRootOn() ? (
            <CustomTooltip enterDelay={1000} title="Column Toggled ON">
              <CheckIcon color="success" />
            </CustomTooltip>
          ) : (
            <CustomTooltip enterDelay={1000} title="Column Toggled OFF">
              <CloseIcon color="error" />
            </CustomTooltip>
          )}
        </div>
        <CustomTooltip
          enterDelay={1000}
          placement="right"
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

const Age = observer(({ info }: { info: EventSearchInfo }) => {
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

  const verifyAgesAndAddAgeMargin = () => {
    if (!info.age) return null;
    let { topAge, baseAge } = info.age;
    if ((topAge -= 3) < 0) {
      topAge = 0;
    }
    if ((baseAge += 3) < 0) {
      baseAge = 0;
    }
    return { topAge: topAge, baseAge: baseAge };
  };

  const centerTimeOnEvent = () => {
    const ages = verifyAgesAndAddAgeMargin();
    if (!ages) return;
    actions.setTopStageAge(ages.topAge, info.unit);
    actions.setBaseStageAge(ages.baseAge, info.unit);
  };

  const extendTimeToIncludeEvent = () => {
    const ages = verifyAgesAndAddAgeMargin();
    if (!ages) return;
    if (state.settings.timeSettings[info.unit].topStageAge > ages.topAge) {
      actions.setTopStageAge(ages.topAge, info.unit);
    }
    if (state.settings.timeSettings[info.unit].baseStageAge < ages.baseAge) {
      actions.setBaseStageAge(ages.baseAge, info.unit);
    }
  };

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
  return (
    <div className="search-result-age-container">
      <div className="search-result-age-icon">
        {isAgeWithinTimeInterval(info) ? (
          <CustomTooltip enterDelay={1000} title="Age within time interval">
            <CheckIcon color="success" />
          </CustomTooltip>
        ) : (
          <CustomTooltip enterDelay={1000} title="Age not within time interval">
            <CloseIcon color="error" />
          </CustomTooltip>
        )}
      </div>
      <div className="search-result-age-text">
        <AgeDisplay />
      </div>
      <div className="search-result-age-buttons">
        <CustomTooltip title="center time interval on event">
          <IconButton
            onClick={() => {
              centerTimeOnEvent();
              actions.setColumnOn(false, column);
              actions.toggleSettingsTabColumn(column);
            }}>
            <VerticalAlignCenterIcon color="info" />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip title="extend time interval to include event">
          <IconButton
            onClick={() => {
              extendTimeToIncludeEvent();
              actions.setColumnOn(false, column);
              actions.toggleSettingsTabColumn(column);
            }}>
            <FormatLineSpacingIcon color="info" />
          </IconButton>
        </CustomTooltip>
      </div>
    </div>
  );
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
          <TableCell className="event-group-header-text" align="left">
            Column
          </TableCell>
          <TableCell className="event-group-header-text" align="center">
            Age
          </TableCell>
          <TableCell className="event-group-header-text" align="center">
            Qualifier
          </TableCell>
          <TableCell className="event-group-header-text" align="right">
            Additional Info
          </TableCell>
        </>
      );
    } else if (typeof info === "string") {
      return (
        <TableCell
          className="event-group-identifier"
          align="center"
          sx={{ backgroundColor: theme.palette.secondaryBackground.main }}
          colSpan={6}>
          <Typography variant="h6">
            <Box className="event-group-identifier-text">{info}</Box>
          </Typography>
        </TableCell>
      );
    } else {
      return (
        <>
          <TableCell align="left">
            <Column info={info} />
          </TableCell>
          <TableCell align="center">
            <Age info={info} />
          </TableCell>
          <TableCell align="center">
            <Qualifier info={info} />
          </TableCell>
          <TableCell align="right">
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
      <TableVirtuoso
        className="events-search-results-table"
        data={stretchedEvents}
        components={VirtuosoTableComponents}
        itemContent={EventGroup}
      />
    </Box>
  );
};
