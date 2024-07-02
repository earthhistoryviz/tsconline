import { TableRow, TableCell, TableHead, TableBody, TableContainer, Paper, SvgIcon, Typography } from "@mui/material";
import { ColumnInfo } from "@tsconline/shared";
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
import { SearchDisplayInfo } from "../types";
type temp = {
  key: string;
  info: SearchDisplayInfo[];
};
const Checkbox = observer(({ column }: { column?: ColumnInfo }) => {
  const { actions } = useContext(context);

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
      onClick={(event) => {
        // to stop selection of column when clicking on checkbox
        event.stopPropagation();
        actions.toggleSettingsTabColumn(column);
      }}
    />
  );
});

export const Results = ({ arr }: { arr: temp[] }) => {
  const { state } = useContext(context);
  const theme = useTheme();

  function Row(props: { row: temp; index: number }) {
    const { row, index } = props;
    console.log(row);
    return (
      <Table cellPadding="none" style={{ width: "100%", paddingTop: "0", paddingBottom: "0" }}>
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
            <TableCell align="justify">Add to Chart</TableCell>
            <TableCell align="justify">Column Path</TableCell>
            <TableCell align="center">Age</TableCell>
            <TableCell align="right">Qualifier</TableCell>
            <TableCell align="right">Additional Info</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {row.info.map((info, innerIndex) => (
            <TableRow key={index + " " + innerIndex}>
              <TableCell align="justify">
                <Checkbox
                  column={state.settingsTabs.columnHashMap.get(
                   info.columnName
                  )}
                />
              </TableCell>
              <TableCell>
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
              <TableCell align="right">{info.qualifier}</TableCell>
              {info.notes === "--" ? (
                <TableCell align="right">{info.notes}</TableCell>
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
  const VirtuosoTableComponents: TableComponents<temp> = {
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
    <Paper sx={{ height: "70vh", width: "50vw", marginTop: "2vh" }}>
      <TableVirtuoso
        initialTopMostItemIndex={0}
        data={arr}
        components={VirtuosoTableComponents}
        itemContent={(index, row) => Row({ row, index })}
      />
    </Paper>
  );
};
