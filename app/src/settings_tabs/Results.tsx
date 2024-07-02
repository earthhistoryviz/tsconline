import {
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  TableContainer,
  Paper,
  SvgIcon,
  Typography,
  Box
} from "@mui/material";
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

const Checkbox = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  //for synchronous update of event in context lists
  const column = state.settingsTabs.columnHashMap.get(info.columnName);

  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  // console.log(index, info.columnName, state.settingsTabs.addSearchResultToChart[info.id])
  return (
    <TSCCheckbox
      inputProps={{ "aria-label": "controlled" }}
      checked={state.settingsTabs.addSearchResultToChart[info.id]}
      onClick={() => {
        actions.setAddSearchResultToChart(!state.settingsTabs.addSearchResultToChart[info.id], info.id);
        console.log(state.settingsTabs.addSearchResultToChart[info.id]);
        if (state.settingsTabs.addSearchResultToChart[info.id]) {
          //this is so the columns toggle properly since this checkbox isn't the column on value
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
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
              if (state.settingsTabs.eventInContextTopList && state.settingsTabs.eventInContextTopList[info.unit]) {
                actions.setTopStageAge(state.settingsTabs.eventInContextTopList![info.unit][0].age - 3, info.unit);
              }
              if (state.settingsTabs.eventInContextBaseList && state.settingsTabs.eventInContextBaseList[info.unit]) {
                actions.setBaseStageAge(state.settingsTabs.eventInContextBaseList![info.unit][0].age - 3, info.unit);
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

  function Row(props: { row: GroupedEventSearchInfo; index: number }) {
    const { row, index } = props;
    return (
      <Table cellPadding="none" style={{ width: "100%" }}>
        <TableHead>
          <TableRow>
            <TableCell
              align="center"
              colSpan={5}
              sx={{ backgroundColor: theme.palette.secondaryBackground.main }}
              className="row-identifier">
              <Typography variant="h6">{row.key}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left">Add to Chart</TableCell>
            <TableCell align="left">Column Path</TableCell>
            <TableCell align="center">Age</TableCell>
            <TableCell align="right">Qualifier</TableCell>
            <TableCell align="right">Additional Info</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {row.info.map((info, innerIndex) => (
            <TableRow key={index + " " + innerIndex}>
              <TableCell align="left">
                <Checkbox info={info} />
              </TableCell>
              <TableCell align="left">
                <CustomTooltip
                  title={info.columnPath.map((value, pathIndex) => (
                    <div key={index + " " + innerIndex + " " + pathIndex}>{value}</div>
                  ))}>
                  <Typography noWrap sx={{ width: "10vw" }} variant="subtitle2">
                    {info.columnPath[0]}
                  </Typography>
                </CustomTooltip>
              </TableCell>
              <TableCell align="center">{info.age}</TableCell>
              {info.qualifier === "--"}
              <TableCell align="right">{info.qualifier}</TableCell>
              {info.notes === "--" ? (
                <TableCell align="right">
                  <SvgIcon>
                    <HorizontalRuleIcon />
                  </SvgIcon>
                </TableCell>
              ) : (
                <TableCell align="right">
                  <CustomTooltip title={info.notes}>
                    <SvgIcon>
                      <NotesIcon />
                    </SvgIcon>
                  </CustomTooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  const VirtuosoTableComponents: TableComponents<GroupedEventSearchInfo> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer component={Paper} sx={{ backgroundColor: "white" }} {...props} ref={ref} />
    )),
    Table: (props) => <Table {...props} style={{ width: "100%" }} />,
    TableRow: ({ ...props }) => <TableRow {...props} />,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => <TableBody {...props} ref={ref} />)
  };

  //add display names
  if (!VirtuosoTableComponents.Scroller || !VirtuosoTableComponents.TableBody) return;
  VirtuosoTableComponents.Scroller.displayName = "Scroller";
  VirtuosoTableComponents.TableBody.displayName = "TableBody";

  return (
    <Box sx={{ height: "70vh", width: "50vw", marginTop: "2vh" }}>
      <TableVirtuoso
        initialTopMostItemIndex={0}
        data={groupedEvents}
        components={VirtuosoTableComponents}
        itemContent={(index, row) => Row({ row, index })}
      />
    </Box>
  );
};
