import { Box, Paper, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import "./Search.css";
import { context } from "../state";
import { Results } from "./Results";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";

export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  function makeColumnPath(name: string): string[] {
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
    if (state.settingsTabs.eventSearchTerm === "") return [];

    //key: column name/event name
    //info: info found in subinfo array
    const results = new Map<string, EventSearchInfo[]>();

    for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
      if (columnInfo.name === "Chart Root") {
        continue;
      }
      if (columnInfo.editName.toLowerCase().includes(state.settingsTabs.eventSearchTerm.toLowerCase())) {
        //for column names
        const id = columnInfo.editName + " - " + "Column";
        if (!results.has(id)) {
          results.set(id, []);
        }
        results.get(id)!.push({
          id: count.current,
          columnName: columnInfo.name,
          columnPath: makeColumnPath(columnInfo.name),
          unit: columnInfo.units
        });
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
            if (subInfo.label!.toLowerCase().includes(state.settingsTabs.eventSearchTerm.toLowerCase())) {
              const resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
              const resInfo: EventSearchInfo = {
                id: count.current,
                columnName: columnInfo.name,
                columnPath: makeColumnPath(columnInfo.name),
                unit: columnInfo.units
              };

              //facies/chron label doesn't have subinfo because they are block type but its parent has facies/chron info, so access it through BlockSeriesMetaColumn
              if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                if (state.settingsTabs.columnHashMap.get(columnInfo.name + " Facies Label")) {
                  resInfo.columnPath = makeColumnPath(columnInfo.name + " Facies Label");
                  resInfo.columnName = columnInfo.name + " Facies Label";
                } else if (state.settingsTabs.columnHashMap.get(columnInfo.name + " Chron Label")) {
                  resInfo.columnPath = makeColumnPath(columnInfo.name + " Chron Label");
                  resInfo.columnName = columnInfo.name + " Chron Label";
                } else {
                  console.error(
                    "While searching, could not find Facies or Chron label for " +
                      columnInfo.name +
                      " but should have found it"
                  );
                  continue;
                }
              }
              if ("age" in subInfo) {
                //facies and chron label show up as block, so find ranges for them too
                if (resultType === "Block" || columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                  if (i > 0) {
                    const nextBlock = columnInfo.subInfo[i - 1];
                    if ("age" in nextBlock) resInfo.age = { topAge: nextBlock.age, baseAge: subInfo.age };
                  } else resInfo.age = { topAge: subInfo.age, baseAge: subInfo.age };
                } else {
                  resInfo.age = { topAge: subInfo.age, baseAge: subInfo.age };
                }
              }
              if ("subEventType" in subInfo) {
                resInfo.qualifier = subInfo.subEventType;
              }
              if ("popup" in subInfo) {
                resInfo.notes = subInfo.popup;
              }
              //same special case as above
              const key =
                resultType === "BlockSeriesMetaColumn"
                  ? subInfo.label + " - " + "Block"
                  : subInfo.label + " - " + resultType;
              if (!results.has(key)) {
                results.set(key, []);
              }
              const eventGroup = results.get(key)!;
              eventGroup.push(resInfo);
              count.current++;
            }
          }
        }
      }
    }

    const groupedEvents: GroupedEventSearchInfo[] = [];
    results.forEach((info: EventSearchInfo[], key: string) => {
      groupedEvents.push({ key: key, info: [...info] });
    });
    return groupedEvents;
  }

  const TimeDisplay = observer(() => {
    const [units, setUnits] = useState<string>(Object.keys(state.settings.timeSettings)[0]);
    return (
      <Paper
        variant="outlined"
        className="search-time-display-container"
        sx={(theme) => ({
          backgroundColor: theme.palette.backgroundColor.main
        })}>
        <ToggleButtonGroup
          value={units}
          exclusive
          size="small"
          onChange={(_event: React.MouseEvent<HTMLElement>, value: string) => {
            if (value === null) {
              return;
            }
            setUnits(value);
          }}
          className="ToggleButtonGroup"
          aria-label="Units">
          {Object.keys(state.settings.timeSettings).map((unit) => (
            <ToggleButton key={unit} value={unit} disableRipple>
              {unit}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box className="search-time-display-ages-container">
          <Box
            className="search-time-display-ages"
            bgcolor="secondaryBackground.main"
            sx={{
              display: "inline",
              borderRadius: 2
            }}>
            Top Age: {state.settings.timeSettings[units].topStageAge}
          </Box>
          <Box
            className="search-time-display-ages"
            bgcolor="secondaryBackground.main"
            sx={{
              display: "inline",
              borderRadius: 2
            }}>
            Base Age:
            {state.settings.timeSettings[units].baseStageAge}
          </Box>
        </Box>
      </Paper>
    );
  });

  return (
    <div className="search-container">
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div className="search-and-options">
          <TextField
            className="search-bar"
            label="Search"
            variant="outlined"
            size="small"
            fullWidth
            onChange={(e) => actions.setEventSearchTerm(e.target.value)}
            value={state.settingsTabs.eventSearchTerm}
          />
          <div>Found {count.current} Results</div>
        </div>
        <TimeDisplay />
      </div>
      <Results groupedEvents={searchResultData()} />
    </div>
  );
});
