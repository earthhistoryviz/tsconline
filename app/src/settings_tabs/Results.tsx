import { TableCell, TableBody, TableContainer, Paper, SvgIcon, Typography, Box } from "@mui/material";
import React, { useContext, useEffect } from "react";
import { Table } from "react-bootstrap";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import { CustomTooltip, TSCCheckbox } from "../components";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ErrorOutline } from "@mui/icons-material";
import NotesIcon from "@mui/icons-material/Notes";
import { useTheme } from "@mui/material/styles";
import "./Results.css";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { trimQuotes } from "../util/util";
const Checkbox = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  return (
    <TSCCheckbox
      //use global state because if state is in this component, the checkbox rerenders out of view so state is reset
      //and if state is in parent component, changing it rerenders the entire component which sets scroll position to the top
      checked={state.settingsTabs.addSearchResultToChart[info.id][0]}
      onClick={() => {
        if (!state.settingsTabs.addSearchResultToChart[info.id][0]) {
          let pathColumn = column;
          const pathAdded: boolean[] = [];
          while (pathColumn.parent != null) {
            pathAdded.push(pathColumn.on);
            const parent = state.settingsTabs.columnHashMap.get(pathColumn.parent);
            if (!parent) break;
            pathColumn = parent;
          }
          actions.setAddSearchResultToChart([true, ...pathAdded.slice(1)], info.id);

          //this is so the columns toggle properly since this checkbox isn't the column on value
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
        } else {
          let pathColumn = column;
          const pathAdded = state.settingsTabs.addSearchResultToChart[info.id];
          for (const on of pathAdded) {
            actions.setColumnOn(on, pathColumn);
            if (!pathColumn.parent) break;
            const parent = state.settingsTabs.columnHashMap.get(pathColumn.parent);
            if (!parent) break;
            pathColumn = parent;
          }
          actions.setAddSearchResultToChart([false, ...pathAdded.slice(1)], info.id);
          actions.setColumnOn(false, column);
        }
        //in-context feature, adds 3myr to above and below the age
        if (state.settingsTabs.eventInContext) {
          if ("age" in info) {
            const eventContextTop = { key: column.name, age: 0 };
            const eventContextBase = { key: column.name, age: 0 };
            if (info.age!.includes("-")) {
              const ages = info.age!.split(" - ");
              eventContextTop.age = Number(ages[0]);
              eventContextBase.age = Number(ages[1]);
            } else {
              eventContextTop.age = Number(info.age!);
              eventContextBase.age = Number(info.age!);
            }
            if (state.settingsTabs.addSearchResultToChart[info.id]) {
              actions.InsertEventInContextTopList(eventContextTop, info.unit);
              actions.InsertEventInContextBaseList(eventContextBase, info.unit);
              if (!state.settingsTabs.eventInContextTopList || !state.settingsTabs.eventInContextBaseList) {
                return;
              }
              actions.setTopStageAge(state.settingsTabs.eventInContextTopList[info.unit][0].age - 3, info.unit);
              actions.setBaseStageAge(state.settingsTabs.eventInContextBaseList[info.unit][0].age + 3, info.unit);
            } else {
              actions.removeEventInContextTopList(eventContextTop, info.unit);
              actions.removeEventInContextBaseList(eventContextBase, info.unit);
              //removed all events, restore age
              if (!state.settingsTabs.eventInContextTopList && state.settingsTabs.ageBeforeContext) {
                actions.setTopStageAge(state.settingsTabs.ageBeforeContext[info.unit].topAge, info.unit);
              }
              if (!state.settingsTabs.eventInContextBaseList && state.settingsTabs.ageBeforeContext) {
                actions.setBaseStageAge(state.settingsTabs.ageBeforeContext[info.unit].baseAge, info.unit);
              }
              //go back to last selected highest/lowest ages
              if (state.settingsTabs.eventInContextTopList && state.settingsTabs.eventInContextTopList[info.unit]) {
                actions.setTopStageAge(state.settingsTabs.eventInContextTopList![info.unit][0].age - 3, info.unit);
              }
              if (state.settingsTabs.eventInContextBaseList && state.settingsTabs.eventInContextBaseList[info.unit]) {
                actions.setBaseStageAge(state.settingsTabs.eventInContextBaseList![info.unit][0].age + 3, info.unit);
              }
            }
          }
        }
      }}
    />
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
  const { actions } = useContext(context);

  useEffect(() => {
    actions.resetAddSearchResultToChart();
    actions.initAddSearchResultToChart(resultCount);
  }, []);

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
            Add to Chart
          </TableCell>
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
          colSpan={5}>
          <Typography variant="h6">
            <Box className="event-group-identifier-text">{info}</Box>
          </Typography>
        </TableCell>
      );
    } else {
      return (
        <>
          <TableCell align="left">
            <Checkbox info={info} />
          </TableCell>
          <TableCell align="left">
            <CustomTooltip
              placement="right"
              title={info.columnPath.map((value, pathIndex) => (
                <div key={index + " " + pathIndex}>{value}</div>
              ))}>
              <Typography noWrap sx={{ maxWidth: "8vw" }} variant="subtitle2">
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
