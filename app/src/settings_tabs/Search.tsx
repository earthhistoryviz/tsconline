import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  useTheme
} from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import "./Search.css";
import { context } from "../state";
import { Results } from "./Results";
import { StyledScrollbar } from "../components";
import { useTranslation } from "react-i18next";
export const Search = observer(function Search() {
  const { state, actions } = useContext(context);
  const countRef = useRef(0);
  const theme = useTheme();
  const { t } = useTranslation();
  const count = countRef.current; //can't directly pass countRef.current to the translator
  const TimeDisplay = observer(() => {
    return (
      <TableContainer
        component={Paper}
        sx={{ background: theme.palette.backgroundColor.main }}
        className="search-time-display-container">
        <StyledScrollbar>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  className="search-time-display-first-header"
                  sx={{ background: theme.palette.backgroundColor.main }}
                  align="center"
                  colSpan={2}>
                  {t("settings.search.current-time-settings")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  className="search-time-display-second-header"
                  sx={{ background: theme.palette.backgroundColor.main }}
                  align="left">
                  Unit
                </TableCell>
                <TableCell
                  className="search-time-display-second-header"
                  sx={{ background: theme.palette.backgroundColor.main }}
                  align="left">
                  Top/Base
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(state.settings.timeSettings).map((unit) => (
                <TableRow key={unit} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell>{unit}</TableCell>
                  <TableCell align="left">
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
            label={t("settings.search.search-bar")}
            variant="outlined"
            size="small"
            fullWidth
            onChange={async (e) => {
              countRef.current = await actions.searchEvents(e.target.value);
            }}
            value={state.settingsTabs.eventSearchTerm}
          />
          <div>{t("settings.search.found-result", { count })}</div>
        </div>
        <TimeDisplay />
      </div>

      <Results groupedEvents={state.settingsTabs.groupedEvents} />
    </div>
  );
});
