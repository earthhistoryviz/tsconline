import {
  Box,
  IconButton,
  Paper,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { observer } from "mobx-react-lite";
import { Suspense, useContext, useEffect, useRef, useState } from "react";
import "./Search.css";
import {
  ColumnInfo,
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
import { CustomTooltip, TSCCheckbox } from "../components";
import NotesIcon from "@mui/icons-material/Notes";
import { ErrorOutline } from "@mui/icons-material";
import { TableComponents, TableVirtuoso, TableVirtuosoHandle } from "react-virtuoso";
import { Results } from "./Results";
import { ScrollRestoration } from "react-router-dom";

const Checkbox = observer(({ column }: { column?: ColumnInfo }) => {
  const { state, actions } = useContext(context);
  if (!column) {
    return (
      <SvgIcon>
        {" "}
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

export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Ref to access the scrollable div
  const scrollableDivRef = useRef<TableVirtuosoHandle>(null);

  return (
    <div className="search-container">
      <TextField
        className="search-bar"
        label="Search"
        variant="outlined"
        size="small"
        fullWidth
        onChange={(e) => actions.setGeneralSearchTerm(e.target.value)}
        value={state.settingsTabs.generalSearchTerm}
      />
      {state.settingsTabs.generalSearchTerm && (
        <Results scrollRef={scrollableDivRef} term={state.settingsTabs.generalSearchTerm} />
      )}
    </div>
  );
});

// const Results = observer(({ term }: { term: string }) => {
//   const {state, actions} = useContext(context);
//   function columnPath(name: string): string[] {
//     let columnPath: string[] = [];
//     let column = state.settingsTabs.columnHashMap.get(name);
//     if (!column) {
//       return [];
//     }
//     while (column.name !== "Chart Root") {
//       columnPath.push(column.editName);
//       column = state.settingsTabs.columnHashMap.get(column.parent!);
//       if (!column) break;
//     }
//     return columnPath;
//   }
//   if (term === "") return;
//   // if (
//   //   term !== "miocene" &&
//   //   term !== "jurassic" &&
//   //   term !== "chron" &&
//   //   term !== "facies" &&
//   //   term !== "chart" &&
//   //   term !== "ochti" &&
//   //   term !== "erqiao"
//   // )
//   //   return;
//   type displayInfo = {
//     column: string[];
//     age: string;
//     qualifier: string;
//     notes: string;
//   };
//   //outer key: matched term, matches editName not name for columns
//   //inner key: column name
//   //info: info found in subinfo array
//   let results = new Map<string, displayInfo[]>();
//   for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
//     if (columnInfo.name === "Chart Root") {
//       continue;
//     }
//     if (columnInfo.editName.toLowerCase().includes(term)) {
//       //for column names
//       const id = columnInfo.editName + " - " + "Column";
//       if (!results.has(id)) {
//         results.set(id, []);
//       }
//       results.get(id)!.push({ column: columnPath(columnInfo.name), age: "--", qualifier: "--", notes: "--" });
//     }
//     if (columnInfo.subInfo) {
//       //skip since subInfo is not associated with this but the app does it for map points
//       if (columnInfo.columnDisplayType === "MetaColumn") {
//         continue;
//       }
//       for (let i = 0; i < columnInfo.subInfo.length; i++) {
//         const subInfo = columnInfo.subInfo[i];
//         if ("label" in subInfo && subInfo !== undefined) {
//           if (subInfo.label!.toLowerCase().includes(term)) {
//             let resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
//             let resinfo: displayInfo = {
//               column: columnPath(columnInfo.name),
//               age: "--",
//               qualifier: "--",
//               notes: "--"
//             };
//             //special case for facies label since it's a block column but uses subfaciesinfo
//             if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
//               const id = subInfo.label + " - " + "Block";
//               if (!results.has(id)) {
//                 results.set(id, []);
//               }
//               let temp = results.get(id)!;
//               if (i > 0) {
//                 const nextBlock = columnInfo.subInfo[i - 1];
//                 if ("age" in nextBlock) resinfo.age = String(nextBlock.age) + " - " + String(subInfo.age);
//               } else resinfo.age = String(subInfo.age);
//               resinfo.column = columnPath(columnInfo.name + " Facies Label");
//               temp.push(resinfo);
//               continue;
//             }

//             const id = subInfo.label + " - " + resultType;
//             if (!results.has(id)) {
//               results.set(id, []);
//             }
//             let temp = results.get(id)!;

//             switch (resultType) {
//               case "Block":
//                 //has blocks above it
//                 if (i > 0) {
//                   assertSubBlockInfo(subInfo);
//                   const nextBlock = columnInfo.subInfo[i - 1];
//                   if ("age" in nextBlock) resinfo.age = String(nextBlock.age) + " - " + String(subInfo.age);
//                 } else resinfo.age = String(subInfo.age);
//                 break;
//               case "Facies":
//                 assertSubFaciesInfo(subInfo);
//                 resinfo.age = String(subInfo.age);
//                 resinfo.notes = "rocktype: " + subInfo.rockType;
//                 break;
//               case "Event":
//                 assertSubEventInfo(subInfo);
//                 resinfo.qualifier = subInfo.subEventType;
//                 resinfo.age = String(subInfo.age);
//                 resinfo.notes = "line style: " + subInfo.lineStyle + subInfo.popup;
//                 break;
//               case "Range":
//                 assertSubRangeInfo(subInfo);
//                 resinfo.age = String(subInfo.age);
//                 resinfo.notes = "abundance - " + subInfo.abundance;
//                 break;
//               case "Chron":
//                 assertSubChronInfo(subInfo);
//                 resinfo.age = String(subInfo.age);
//                 resinfo.notes = "polarity: " + subInfo.polarity;
//                 break;
//               case "Freehand":
//                 break;
//               case "Point":
//                 break;
//               case "Sequence":
//                 assertSubSequenceInfo(subInfo);
//                 resinfo.age = String(subInfo.age);
//                 resinfo.notes = "direction: " + subInfo.direction + "\n" + "severity: " + subInfo.severity;
//                 break;
//               case "Transect":
//                 assertSubTransectInfo(subInfo);
//                 resinfo.age = String(subInfo.age);
//                 break;
//             }
//             temp.push(resinfo);
//           }
//         }
//       }
//     }
//   }
//   // console.log(results);
//   type temp = {
//     key: string;
//     info: displayInfo[];
//   };
//   let arr: temp[] = Array();
//   results.forEach((info: displayInfo[], key: string) => {
//     arr.push({ key: key, info: [...info] });
//   });
//   console.log(arr);

// // Define the type for the state
// type ItemStates = {
//     [key: string]: boolean;
// };

// // Initialize the state with an object containing boolean values for each item
// const [itemStates, setItemStates] = useState<ItemStates>(() =>
//     arr.reduce<ItemStates>((acc, item) => {
//         acc[item.key] = false;
//         return acc;
//     }, {})
// );

// // Function to toggle the boolean state of a specific item
// const toggleItemState = (itemName: string) => {
//     setItemStates((prevStates) => ({
//         ...prevStates,
//         [itemName]: !prevStates[itemName],
//     }));
// };

//   function Row(props: { row: temp; index: number }) {
//     const { row, index } = props;

//     return (
//       <React.Fragment>
//         <TableRow  sx={{ "& > *": { borderBottom: "unset" }, width:"50vw" }}>
//           <TableCell  align="justify">
//             <IconButton aria-label="expand row" size="small" onClick={() => toggleItemState(row.key)}>
//               {itemStates[row.key] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
//             </IconButton>
//           </TableCell>
//           <TableCell style={{ width: "100%" }} onClick={() => toggleItemState(row.key)} component="th" scope="row" align="center">
//             {row.key}
//           </TableCell>
//           <TableCell align="right">
//             <IconButton aria-label="expand row" size="small" onClick={() => toggleItemState(row.key)}>
//               {itemStates[row.key] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
//             </IconButton>
//           </TableCell>
//         </TableRow>
//         <TableRow>
//           <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
//             <Collapse in={itemStates[row.key]} unmountOnExit>
//               <Box sx={{ margin: 1 }}>
//                 <Table size="small" aria-label="purchases">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell align="justify">Add to Chart</TableCell>
//                       <TableCell align="justify">Column Path</TableCell>
//                       <TableCell align="center">Age</TableCell>
//                       <TableCell align="right">Qualifier</TableCell>
//                       <TableCell align="right">Additional Info</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {row.info.map((info, innerIndex) => (
//                       <TableRow key={index + " " + innerIndex}>
//                         <TableCell align="justify">
//                           <Checkbox column={state.settingsTabs.columnHashMap.get(info.column[0])}/>
//                         </TableCell>
//                         <TableCell>
//                           <CustomTooltip
//                             title={info.column.map((value) => (
//                               <div>{value}</div>
//                             ))}>
//                             <Typography noWrap sx={{ width: "10vw" }} variant="subtitle2">
//                               {info.column}
//                             </Typography>
//                           </CustomTooltip>
//                         </TableCell>
//                         <TableCell align="center" component="th" scope="row">
//                           {info.age}
//                         </TableCell>
//                         <TableCell align="right">{info.qualifier}</TableCell>
//                         {info.notes === "--" ? (
//                           <TableCell align="right">{info.notes}</TableCell>
//                         ) : (
//                           <TableCell align="right">
//                             <CustomTooltip title={info.notes}>
//                             <SvgIcon>
//                               <NotesIcon />
//                             </SvgIcon>
//                             </CustomTooltip>

//                           </TableCell>
//                         )}
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </Box>
//             </Collapse>
//           </TableCell>
//         </TableRow>
//       </React.Fragment>
//     );
//   }

//   const VirtuosoTableComponents: TableComponents<temp> = {
//     Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
//       <TableContainer component={Paper} sx={{ backgroundColor: "white" }} {...props} ref={ref} />
//     )),
//     Table: (props) => <Table {...props} sx={{ borderCollapse: "separate", tableLayout: "fixed" }} />,
//     TableRow: ({ item: _item, ...props }) => <TableRow {...props} />,
//     TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => <TableBody {...props} ref={ref}/>)
//   };
//   return (
//     <Paper style={{ height: 400, width: "60vw" }}>
//       <TableVirtuoso
//         data={arr}
//         components={VirtuosoTableComponents}
//         itemContent={(index, row) => Row({ row, index })}
//       />
//     </Paper>
//   );
// });
