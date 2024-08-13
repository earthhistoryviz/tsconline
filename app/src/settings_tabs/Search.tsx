import { TextField, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import "./Search.css";
import { context } from "../state";
import { Results } from "./Results";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const countRef = useRef(0);
  const TimeDisplay = observer(() => {
    return (
      <div className="search-time-display-container">
        <Typography>Current Time Settings (Top / Base)</Typography>
        <div className="search-time-display-ages-container">
          <div className="time-display-resize-wrapper">
            {Object.keys(state.settings.timeSettings).map((unit) => (
              <div className="search-time-display-ages" key={unit}>
                <Typography width={"50%"}>{unit}:</Typography>
                <Typography>
                  {state.settings.timeSettings[unit].topStageAge} / {state.settings.timeSettings[unit].baseStageAge}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </div>
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
            onChange={async (e) => {
              countRef.current = await actions.searchEvents(e.target.value);
            }}
            value={state.settingsTabs.eventSearchTerm}
          />
          <div>Found {countRef.current} Results</div>
        </div>
        <TimeDisplay />
      </div>

      <Results groupedEvents={state.settingsTabs.groupedEvents} />
    </div>
  );
});
