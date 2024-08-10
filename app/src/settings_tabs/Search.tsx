import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import "./Search.css";
import { context } from "../state";
import { Results } from "./Results";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import { StyledScrollbar } from "../components";
export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const countRef = useRef(0);
  const TimeDisplay = observer(() => {
    return (
      <TableContainer component={Paper} className="search-time-display-container">
        <StyledScrollbar>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ padding: 0 }} align="center" colSpan={2}>
                  Current Time Settings
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ padding: "0 16px" }} align="left">
                  Unit
                </TableCell>
                <TableCell sx={{ padding: "0 16px" }} align="right">
                  Top/Base
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(state.settings.timeSettings).map((unit) => (
                <TableRow key={unit} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell>{unit}</TableCell>
                  <TableCell align="right">
                    {state.settings.timeSettings[unit].topStageAge}/{state.settings.timeSettings[unit].baseStageAge}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledScrollbar>
      </TableContainer>
    );
  });

  return (
    <div className="search-container">
      <div className="search-header-container">
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
