import { TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
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
import { TSCCheckbox } from "../components";

export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
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
    if (state.settingsTabs.eventSearchTerm === "") return [];
    //key: column name/event name
    //info: info found in subinfo array
    const results = new Map<string, EventSearchInfo[]>();
    for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
      if (columnInfo.name === "Chart Root") {
        continue;
      }
      if (columnInfo.editName.toLowerCase().includes(state.settingsTabs.eventSearchTerm)) {
        //for column names
        const id = columnInfo.editName + " - " + "Column";
        if (!results.has(id)) {
          results.set(id, []);
        }
        results.get(id)!.push({
          id: count.current,
          columnName: columnInfo.name,
          columnPath: columnPath(columnInfo.name),
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
            if (subInfo.label!.toLowerCase().includes(state.settingsTabs.eventSearchTerm)) {
              const resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
              const resinfo: EventSearchInfo = {
                id: count.current,
                columnName: columnInfo.name,
                columnPath: columnPath(columnInfo.name),
                unit: columnInfo.units
              };
              //special case for facies and chron label since they are intervals and shows up as block but uses subfacies/subchron info
              if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                const id = subInfo.label + " - " + "Block";
                if (!results.has(id)) {
                  results.set(id, []);
                }
                const eventGroup = results.get(id)!;
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
                eventGroup.push(resinfo);
                count.current++;
                continue;
              }

              const id = subInfo.label + " - " + resultType;
              if (!results.has(id)) {
                results.set(id, []);
              }
              const eventGroup = results.get(id)!;

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
                case "Sequence":
                  assertSubSequenceInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  resinfo.notes = "direction: " + subInfo.direction + "\n" + "severity: " + subInfo.severity;
                  break;
                case "Transect":
                  assertSubTransectInfo(subInfo);
                  resinfo.age = String(subInfo.age);
                  break;
                // no subinfo labels and falls under column tag
                // case "Freehand":
                // case "Point":
              }
              eventGroup.push(resinfo);
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
  const InContext = observer(() => {
    return (
      <div>
        <TSCCheckbox
          checked={state.settingsTabs.eventInContext}
          onClick={() => {
            //in-context feature, adds 3myr to above and below the age
            actions.setEventInContext(!state.settingsTabs.eventInContext);
            if (state.settingsTabs.eventInContext) {
              actions.createAgeBeforeContext();
            } else {
              actions.resetEventInContextLists();
              //
            }
          }}
        />
        Select 3ma around event for chart generation
      </div>
    );
  });
  //cleanup event history on tab change
  useEffect(() => {
    return () => {
      actions.resetEventInContextLists();
    };
  });
  return (
    <div className="search-container">
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
      </div>
      <div>Found {count.current} Results</div>
      <InContext />
      <Results
        key={state.settingsTabs.eventSearchTerm}
        groupedEvents={searchResultData()}
        resultCount={count.current}
      />
    </div>
  );
});
