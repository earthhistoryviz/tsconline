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
import "./Results.css";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { trimQuotes } from "../util/util";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const Column = observer(({ columnName, columnPath }: { columnName: string; columnPath: string[] }) => {
  const { state, actions } = useContext(context);
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
  return (
    <div>
      <div
        className="search-result-column-container"
        onClick={() => {
          actions.toggleSettingsTabColumn(column);
        }}>
        <div style={{ marginRight: "1vw" }}>
          {ColumnPathToRootOn() ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
        </div>
        <CustomTooltip
          placement="right"
          title={columnPath.map((value, pathIndex) => (
            <div key={pathIndex}>{value}</div>
          ))}>
          <Typography noWrap variant="subtitle2">
            {columnPath[0]}
          </Typography>
        </CustomTooltip>
      </div>
    </div>
  );
});

const ModifyTimeInterval = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  if (!("age" in info)) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }
  const verifyAgesAndAddAgeMargin = () => {
    //checks if age is in `float - float` format
    const regex = /^[+-]?(\d*\.\d+|\d+)(\s-\s)[+-]?(\d*\.\d+|\d+)$/;
    let topAge = 0;
    let baseAge = 0;
    if (regex.test(info.age!)) {
      const ages = info.age!.split(" - ");
      topAge = Number(ages[0]) - 3;
      baseAge = Number(ages[1]) + 3;
    } else if (!isNaN(Number(info.age))) {
      topAge = Number(info.age) - 3;
      baseAge = Number(info.age) + 3;
    } else {
      actions.pushSnackbar("Invalid age found while searching", "warning");
      return null;
    }
    if (topAge < 0) {
      topAge = 0;
    }
    if (baseAge < 0) {
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

  const isAgeWithinTimeInterval = () => {
    if (!(info.unit in state.settings.timeSettings)) {
      console.error(info.unit + "not in time settings");
      return false;
    }
    const chartTopAge = state.settings.timeSettings[info.unit].topStageAge;
    const chartBaseAge = state.settings.timeSettings[info.unit].baseStageAge;
    const ages = verifyAgesAndAddAgeMargin();
    if (!ages) return false;
    if (ages.topAge + 3 >= chartTopAge && ages.baseAge - 3 <= chartBaseAge) {
      return true;
    }
    return false;
  };
  return (
    <div className="search-result-age-container">
      <div className="search-result-age-icon">
        {isAgeWithinTimeInterval() ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
      </div>
      <div className="search-result-age-text">{info.age}</div>
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
            <Column columnName={info.columnName} columnPath={info.columnPath} />
          </TableCell>
          <TableCell align="center">
            {info.age ? (
              <ModifyTimeInterval info={info} />
            ) : (
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            )}
          </TableCell>
          <TableCell align="center">
            {info.qualifier ? (
              <div>{info.qualifier}</div>
            ) : (
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            )}
          </TableCell>
          <TableCell align="right">
            {info.notes ? (
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
            ) : (
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            )}
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
    <Box className="table-container">
      <TableVirtuoso
        className="events-search-results-table"
        data={stretchedEvents}
        components={VirtuosoTableComponents}
        itemContent={EventGroup}
      />
    </Box>
  );
};
