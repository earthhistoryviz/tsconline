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
import React, { useContext, useState } from "react";
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
  const [on, setOn] = useState<boolean>(false);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  //piacenzian, zanclean, messinian
  return (
    <TSCCheckbox
      checked={on}
      onClick={() => {
        setOn(!on);
        if (on) {
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
            if (on) {
              if (!state.settingsTabs.eventInContextTopList) {
                actions.setEventInContextTopList([eventContextTop]);
              }
              //insert current event in sorted array
              else {
                const prevLength = state.settingsTabs.eventInContextTopList.length;
                let index = 0;
                for (index; index < state.settingsTabs.eventInContextTopList.length; index++) {
                  const compareEvent = state.settingsTabs.eventInContextTopList[index];
                  if (eventContextTop.age < compareEvent.age) {
                    actions.setEventInContextTopList(
                      state.settingsTabs.eventInContextTopList.splice(index, 0, eventContextTop)
                    );
                    break;
                  }
                  //event already in array
                  else if (eventContextTop.age === compareEvent.age) {
                    if (eventContextTop.key === compareEvent.key) {
                      break;
                    }
                  }
                }
                //add event to end of list
                if (index == prevLength - 1) {
                  actions.setEventInContextTopList(
                    state.settingsTabs.eventInContextTopList.splice(index + 1, 0, eventContextTop)
                  );
                }
              }
              actions.setTopStageAge(state.settingsTabs.eventInContextTopList![0].age - 3, "Ma");

              if (!state.settingsTabs.eventInContextBaseList) {
                actions.setEventInContextBaseList([eventContextBase]);
              }
              //insert current event in sorted array
              else {
                const prevLength = state.settingsTabs.eventInContextBaseList.length;
                let index = 0;
                for (index; index < state.settingsTabs.eventInContextBaseList.length; index++) {
                  const compareEvent = state.settingsTabs.eventInContextBaseList[index];
                  if (eventContextBase.age < compareEvent.age) {
                    actions.setEventInContextBaseList(
                      state.settingsTabs.eventInContextBaseList.splice(index, 0, eventContextBase)
                    );
                    break;
                  }
                  //event already in array
                  else if (eventContextBase.age === compareEvent.age) {
                    if (eventContextBase.key === compareEvent.key) {
                      break;
                    }
                  }
                }
                //add event to end of list
                if (index == prevLength - 1) {
                  actions.setEventInContextBaseList(
                    state.settingsTabs.eventInContextBaseList.splice(index + 1, 0, eventContextBase)
                  );
                }
              }
              actions.setBaseStageAge(state.settingsTabs.eventInContextBaseList![0].age + 3, "Ma");
            } else {
              //if checkbox is toggled off, this should always exist but check it for typescript
              if (state.settingsTabs.eventInContextTopList) {
                let index = 0;
                for (index; index < state.settingsTabs.eventInContextTopList.length; index++) {
                  const compareEvent = state.settingsTabs.eventInContextTopList[index];
                  if (compareEvent.key === eventContextTop.key && compareEvent.age === eventContextTop.age) {
                    actions.setEventInContextTopList(state.settingsTabs.eventInContextTopList.splice(index, 1));
                    if (index === 0) {
                      actions.setTopStageAge(state.settingsTabs.eventInContextTopList[0].age - 3, "Ma");
                    }
                  }
                }
              }

              if (state.settingsTabs.eventInContextBaseList) {
                let index = 0;
                for (index; index < state.settingsTabs.eventInContextBaseList.length; index++) {
                  const compareEvent = state.settingsTabs.eventInContextBaseList[index];
                  if (compareEvent.key === eventContextBase.key && compareEvent.age === eventContextBase.age) {
                    actions.setEventInContextBaseList(state.settingsTabs.eventInContextBaseList.splice(index, 1));
                    if (index === 0) {
                      actions.setBaseStageAge(state.settingsTabs.eventInContextBaseList[0].age + 3, "Ma");
                    }
                  }
                }
              }
            }
          }
        }
      }}
    />
  );
});

export const Results = ({ arr }: { arr: GroupedEventSearchInfo[] }) => {
  const theme = useTheme();

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
        data={arr}
        components={VirtuosoTableComponents}
        itemContent={(index, row) => Row({ row, index })}
      />
    </Box>
  );
};
