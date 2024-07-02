import { Box, IconButton, Switch, TextField, Typography, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
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
import { context } from "../state";
import { Results } from "./Results";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import React from "react";
import { CustomTooltip } from "../components";
import SettingsIcon from "@mui/icons-material/Settings";

export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  function columnPath(name: string): string[] {
    const columnPath: string[] = [];
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
  const count = useRef(0);
  function searchResultData() {
    count.current = 0;
    //columnPath: list of editName path before chart root
    //outer key: matched term, matches editName for columns
    //inner key: column name
    //info: info found in subinfo array
    const results = new Map<string, EventSearchInfo[]>();
    for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
      if (columnInfo.name === "Chart Root") {
        continue;
      }
      if (columnInfo.editName.toLowerCase().includes(state.settingsTabs.generalSearchTerm)) {
        //for column names
        const id = columnInfo.editName + " - " + "Column";
        if (!results.has(id)) {
          results.set(id, []);
        }
        results.get(id)!.push({ columnName: columnInfo.name, columnPath: columnPath(columnInfo.name) });
        count.current++;
      }
      if (columnInfo.subInfo) {
        //skip since subInfo is not associated with this but the app does it for map points
        if (columnInfo.columnDisplayType === "MetaColumn") {
          continue;
        }
        for (let i = 0; i < columnInfo.subInfo.length; i++) {
          const subInfo = columnInfo.subInfo[i];

          if ("label" in subInfo) {
            if (subInfo.label!.toLowerCase().includes(state.settingsTabs.generalSearchTerm)) {
              const resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
              const resinfo: EventSearchInfo = {
                columnName: columnInfo.name,
                columnPath: columnPath(columnInfo.name)
              };
              //special case for facies and chron label since they are intervals and shows up as block but uses subfacies/subchron info
              if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                const id = subInfo.label + " - " + "Block";
                if (!results.has(id)) {
                  results.set(id, []);
                }
                const temp = results.get(id)!;
                if (i > 0) {
                  const nextBlock = columnInfo.subInfo[i - 1];
                  if ("age" in nextBlock) resinfo.age = String(nextBlock.age) + " - " + String(subInfo.age);
                } else resinfo.age = String(subInfo.age);

                if ((resinfo.columnPath = columnPath(columnInfo.name + " Facies Label")).length === 0) {
                  resinfo.columnPath = columnPath(columnInfo.name + " Chron Label");
                  resinfo.columnName = columnInfo.name + " Chron Label";
                } else {
                  resinfo.columnName = columnInfo.name + " Facies Label";
                }
                temp.push(resinfo);
                continue;
              }

              const id = subInfo.label + " - " + resultType;
              if (!results.has(id)) {
                results.set(id, []);
              }
              const temp = results.get(id)!;

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
                  resinfo.notes = "line style: " + subInfo.lineStyle + subInfo.popup;
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
              count.current++;
            }
          }
        }
      }
    }

    const arr: GroupedEventSearchInfo[] = [];
    results.forEach((info: EventSearchInfo[], key: string) => {
      arr.push({ key: key, info: [...info] });
    });
    console.log(arr);
    return arr;
  }
  const OptionsButton = () => {
    const [open, setOpen] = React.useState<boolean>(false);
    const handleClick = () => {
      setOpen(!open);
    };
    const handleSwitch = () => {
      actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);
    };
    return (
      <div>
        <CustomTooltip title="Options">
          <IconButton id="option-button" onClick={handleClick}>
            <SettingsIcon />
          </IconButton>
        </CustomTooltip>
        <Box
          sx={{
            border: "2px solid",
            borderColor: theme.palette.divider,
            bgcolor: theme.palette.backgroundColor.main
          }}
          style={{ display: open ? "flex" : "none", position: "absolute", zIndex: "100" }}>
          <div className="flex-row">
            <Typography sx={{ p: 2 }}>Zoom on Scroll</Typography>
            <div style={{ margin: "auto" }}>
              <Switch
                inputProps={{ "aria-label": "controlled" }}
                defaultChecked={state.chartTab.enableScrollZoom}
                onChange={handleSwitch}
                color="info"
              />
            </div>
          </div>
        </Box>
      </div>
    );
  };
  return (
    <div className="search-container">
      <div className="search-and-options">
        <SettingsIcon id="spacer" />
        <TextField
          className="search-bar"
          label="Search"
          variant="outlined"
          size="small"
          fullWidth
          onChange={(e) => actions.setGeneralSearchTerm(e.target.value)}
          value={state.settingsTabs.generalSearchTerm}
        />
        <OptionsButton />
      </div>

      <div>Found {count.current} Results</div>
      <Results key={state.settingsTabs.generalSearchTerm} arr={searchResultData()} />
    </div>
  );
});
