import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import "./Search.css";
import {
  assertSubBlockInfo,
  assertSubChronInfo,
  assertSubEventInfo,
  assertSubFaciesInfo,
  assertSubRangeInfo,
  assertSubSequenceInfo,
  assertSubTransectInfo
} from "@tsconline/shared";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { context } from "../state";
import { Collapse } from "react-bootstrap";
import React from "react";
import { TSCCheckbox } from "../components";

export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const [term, setTerm] = useState("");
  function columnPath(name: string): string[] {
    let columnPath: string[] = [];
    let column = state.settingsTabs.columnHashMap.get(name);
    if (!column) {
      return [];
    }
    while (column.name !== "Chart Root") {
      columnPath.push(column.editName);
      column = state.settingsTabs.columnHashMap.get(column.parent!);
      if (!column) break;
    }
    return columnPath;
  }
  const Results = () => {
    if (term === "") return;
    type displayInfo = {
      column: string[];
      age: string;
      qualifier: string;
      notes: string;
    };
    //outer key: matched term, matches editName not name for columns
    //inner key: column name
    //info: info found in subinfo array
    let results = new Map<string, displayInfo[]>();
    for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
      console.log("yo");
      if (columnInfo.columnDisplayType === "Facies") {
        console.log(columnInfo.editName);
      }
      if (
        columnInfo.name === "Main Yangtze Platform Formations" ||
        columnInfo.name === "Yangtze Platform Triassic Lithostratigraphy"
      ) {
        console.log(JSON.parse(JSON.stringify(columnInfo)));
      }
      if (columnInfo.editName.toLowerCase().includes(term)) {
        //for column names
        const id = columnInfo.editName + " - " + "Column";
        if (!results.has(id)) {
          results.set(id, []);
        }
        results.get(id)!.push({ column: [columnInfo.editName], age: "--", qualifier: "--", notes: "--" });
      }
      if (columnInfo.subInfo) {
        //skip since subInfo is not associated with this but the app does it for map points
        if (columnInfo.columnDisplayType === "MetaColumn") {
          continue;
        }
        for (let i = 0; i < columnInfo.subInfo.length; i++) {
          const subInfo = columnInfo.subInfo[i];
          if ("label" in subInfo && subInfo !== undefined) {
            if (subInfo.label!.toLowerCase().includes(term)) {
              let resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
              let resinfo: displayInfo = {
                column: columnPath(columnInfo.name),
                age: "--",
                qualifier: "--",
                notes: "--"
              };
              //special case for facies label since it's a block column but uses subfaciesinfo
              if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                const id = subInfo.label + " - " + "Block";
                if (!results.has(id)) {
                  results.set(id, []);
                }
                let temp = results.get(id)!;
                if (i > 0) {
                  const nextBlock = columnInfo.subInfo[i - 1];
                  if ("age" in nextBlock) resinfo.age = String(nextBlock.age) + " - " + String(subInfo.age);
                } else resinfo.age = String(subInfo.age);
                resinfo.column = columnPath(columnInfo.name + " Facies Label");
                temp.push(resinfo);
                continue;
              }

              const id = subInfo.label + " - " + resultType;
              if (!results.has(id)) {
                results.set(id, []);
              }
              let temp = results.get(id)!;

              switch (resultType) {
                case "Block":
                  //has blocks above it
                  if (i > 0) {
                    assertSubBlockInfo(subInfo);
                    const nextBlock = columnInfo.subInfo[i - 1];
                    if ("age" in nextBlock) resinfo.age = String(nextBlock.age) + " - " + String(subInfo.age);
                  } else resinfo.age = String(subInfo.age);
                  break;
                case "Facies":
                  assertSubFaciesInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "rocktype: " + subInfo.rockType;
                  break;
                case "Event":
                  assertSubEventInfo(subInfo);
                  resinfo.qualifier = subInfo.subEventType;
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "line style: " + subInfo.lineStyle;
                  break;
                case "Range":
                  assertSubRangeInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "abundance - " + subInfo.abundance;
                  break;
                case "Chron":
                  assertSubChronInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "polarity: " + subInfo.polarity;
                  break;
                case "Freehand":
                  break;
                case "Point":
                  break;
                case "Sequence":
                  assertSubSequenceInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "direction: " + subInfo.direction + "\n" + "severity: " + subInfo.severity;
                  break;
                case "Transect":
                  assertSubTransectInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  break;
              }
              temp.push(resinfo);
            }
          }
        }
      }
    }
    console.log(results);
    type temp = {
      key: string;
      info: displayInfo[];
    };
    let arr: temp[] = Array();
    results.forEach((info: displayInfo[], key: string) => {
      arr.push({ key: key, info: [...info] });
    });
    // console.log(arr);
    function Row(props: { row: temp; index: number }) {
      const { row, index } = props;
      const [open, setOpen] = React.useState(false);

      return (
        <React.Fragment>
          <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
            <TableCell align="justify">
              <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </TableCell>
            <TableCell onClick={() => setOpen(!open)} component="th" scope="row" align="center">
              {row.key}
            </TableCell>
            <TableCell align="right">
              <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
              <Collapse in={open} unmountOnExit>
                <Box sx={{ margin: 1 }}>
                  <Table size="small" aria-label="purchases">
                    <TableHead>
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
                            <TSCCheckbox></TSCCheckbox>
                          </TableCell>
                          <TableCell>{info.column[0]}</TableCell>
                          <TableCell align="center" component="th" scope="row">
                            {info.age}
                          </TableCell>
                          <TableCell align="right">{info.qualifier}</TableCell>
                          <TableCell align="right">{info.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    }
    return (
      <TableContainer component={Paper} sx={{ width: "50vw", marginTop: "2vh" }}>
        <Table aria-label="collapsible table" sx={{ backgroundColor: "white" }}>
          <TableBody>
            {arr.map((row, index) => (
              <Row key={index} row={row} index={index} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  return (
    <div className="search-container">
      <TextField
        className="search-bar"
        label="Search"
        variant="outlined"
        size="small"
        fullWidth
        onChange={(e) => setTerm(e.target.value)}
        value={term}
      />
      <Results />
    </div>
  );
});
