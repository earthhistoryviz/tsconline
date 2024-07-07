import { TableCell, TableBody, TableContainer, Paper, SvgIcon, Typography, Box, IconButton } from "@mui/material";
import React, { useContext, useEffect } from "react";
import { Table } from "react-bootstrap";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import { CustomTooltip } from "../components";
import { context, state } from "../state";
import { observer } from "mobx-react-lite";
import { ErrorOutline } from "@mui/icons-material";
import NotesIcon from "@mui/icons-material/Notes";
import { useTheme } from "@mui/material/styles";
import "./Results.css";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { trimQuotes } from "../util/util";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";

const ToggleColumn = observer(({ columnName }: { columnName: string }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  return (
    <div className="events-search-results-buttons">
      <IconButton
        onClick={() => {
          actions.toggleSettingsTabColumn(column);
        }}>
        <CheckIcon />
      </IconButton>
      <IconButton
        onClick={() => {
          actions.setColumnOn(false, column);
        }}>
        <ClearIcon />
      </IconButton>
    </div>
  );
});

const CenterEvent = observer(({ info }: { info: EventSearchInfo }) => {
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
  const verifyAges = () => {
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
    const ages = verifyAges();
    if (!ages) return;
    actions.setTopStageAge(ages.topAge, info.unit);
    actions.setBaseStageAge(ages.baseAge, info.unit);
  };

  const extendTimeToIncludeEvent = () => {
    const ages = verifyAges();
    if (!ages) return;
    if (state.settings.timeSettings[info.unit].topStageAge > ages.topAge) {
      actions.setTopStageAge(ages.topAge, info.unit);
    }
    if (state.settings.timeSettings[info.unit].baseStageAge < ages.baseAge) {
      actions.setBaseStageAge(ages.baseAge, info.unit);
    }
  };
  return (
    <div className="events-search-results-buttons">
      <CustomTooltip title="center time interval on event">
        <IconButton onClick={() => centerTimeOnEvent()}>
          <VerticalAlignCenterIcon />
        </IconButton>
      </CustomTooltip>
      <CustomTooltip title="extend time interval to include event">
        <IconButton onClick={() => extendTimeToIncludeEvent()}>
          <FormatLineSpacingIcon />
        </IconButton>
      </CustomTooltip>
    </div>
  );
});

export const Results = ({
  groupedEvents,
  resultCount
}: {
  groupedEvents: GroupedEventSearchInfo[];
  resultCount: number;
}) => {
  const theme = useTheme();

  //this is necessary to prevent table hierachy errors
  //virtuoso assigns each array element to a table row, and a table row can't be a child
  //of a table row which would be necessary for display without stretching the array.
  const stretchedEvents: (string | EventSearchInfo)[] = [];
  groupedEvents.map((value) => {
    stretchedEvents.push(value.key);
    stretchedEvents.push("header");
    for (const event of value.info) {
      stretchedEvents.push(event);
    }
  });

  function EventGroup(index: number, info: string | EventSearchInfo) {
    if (info === "header") {
      return (
        <>
          <TableCell className="event-group-header-text" align="left">
            Toggle Column
          </TableCell>
          {state.settingsTabs.extendTimeInterval ? (
            <TableCell className="event-group-header-text" align="left">
              extend Time Interval
            </TableCell>
          ) : (
            <TableCell className="event-group-header-text" align="left">
              Modify Time Interval
            </TableCell>
          )}
          <TableCell className="event-group-header-text" align="left">
            Column Path
          </TableCell>
          <TableCell className="event-group-header-text" align="center">
            Age
          </TableCell>
          <TableCell className="event-group-header-text" align="right">
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
            <ToggleColumn columnName={info.columnName} />
          </TableCell>
          <TableCell align="left">
            <CenterEvent info={info} />
          </TableCell>
          <TableCell align="left">
            <CustomTooltip
              placement="right"
              title={info.columnPath.map((value, pathIndex) => (
                <div key={index + " " + pathIndex}>{value}</div>
              ))}>
              <Typography noWrap sx={{ width: "8vw" }} variant="subtitle2">
                {info.columnPath[0]}
              </Typography>
            </CustomTooltip>
          </TableCell>
          {info.age ? (
            <TableCell align="center">{info.age}</TableCell>
          ) : (
            <TableCell align="center">
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            </TableCell>
          )}
          {info.qualifier ? (
            <TableCell align="right">{info.qualifier}</TableCell>
          ) : (
            <TableCell align="right">
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            </TableCell>
          )}
          {info.notes ? (
            <TableCell align="right">
              <CustomTooltip
                sx={{ padding: "0" }}
                title={<Box dangerouslySetInnerHTML={{ __html: trimQuotes(info.notes).replaceAll('""', '"') }} />}>
                <SvgIcon>
                  <NotesIcon />
                </SvgIcon>
              </CustomTooltip>
            </TableCell>
          ) : (
            <TableCell align="right">
              <SvgIcon>
                <HorizontalRuleIcon />
              </SvgIcon>
            </TableCell>
          )}
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
