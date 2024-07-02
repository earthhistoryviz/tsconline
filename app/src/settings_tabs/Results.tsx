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
import React, { useContext } from "react";
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
      checked={column.on}
      onClick={() => {
        actions.toggleSettingsTabColumn(column);
        //in-context feature, adds 3myr to above and below the age
      }}
    />
  );
});

export const Results = ({ arr }: { arr: GroupedEventSearchInfo[] }) => {
  const theme = useTheme();

  function Row(props: { row: GroupedEventSearchInfo; index: number }) {
    const { row, index } = props;
    console.log(row);
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
