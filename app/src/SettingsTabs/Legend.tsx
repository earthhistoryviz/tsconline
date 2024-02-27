import { Autocomplete, Box, IconButton, Typography, useTheme } from "@mui/material";
import { useState, useContext, ChangeEventHandler, ChangeEvent } from "react";
import {
  StyledScrollbar,
  CustomHeader,
  CustomDivider,
  TypographyText,
  TSCTextField,
  TSCInputAdornment
} from "../components";
import { context } from "../state";
import { LegendItem } from "../types";
import { devSafeUrl } from "../util";
import { AvailableIcon, DisabledIcon, InfoIcon, ChildMapIcon } from "./MapButtons";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import "./Legend.css";

/**
 * This is the legend that describes the icons present on the
 * map viewer. Currently uses a legend item array inherently
 * @returns a component with a header and body of icons
 */
export const Legend = () => {
  const [searchValue, setSearchValue] = useState("");
  const theme = useTheme();
  const { state } = useContext(context);
  const filteredPatterns = Object.values(state.mapPatterns).filter((value) => {
    if (value.formattedName.toLowerCase().includes(searchValue)) return true;
  });
  const legendItems: LegendItem[] = [
    { color: theme.palette.on.main, label: "On", icon: AvailableIcon },
    { color: theme.palette.off.main, label: "Off", icon: AvailableIcon },
    {
      color: theme.palette.disabled.main,
      label: "Data not in selected range",
      icon: DisabledIcon
    },
    { color: theme.palette.info.main, label: "Info point", icon: InfoIcon },
    { color: "transparent", label: "Child Map", icon: ChildMapIcon }
  ];
  return (
    <StyledScrollbar
      className="scrollbar-container"
      style={{
        backgroundColor: theme.palette.navbar.dark
      }}>
      <CustomHeader className="legend-header" color="primary">
        Map Points
      </CustomHeader>
      <CustomDivider />
      <div className="legend-container">
        {legendItems.map((item, index) => (
          <DisplayLegendItem key={index} legendItem={item} />
        ))}
      </div>
      <CustomHeader className="legend-header" color="primary">
        Facies Patterns
      </CustomHeader>
      <div className="search-container">
        <div className="facies-search">
          <TSCTextField
            className="search-bar"
            value={searchValue}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              setSearchValue(event.target.value);
            }}
            InputProps={{
              startAdornment: (
                <TSCInputAdornment>
                  {" "}
                  <SearchIcon />
                </TSCInputAdornment>
              )
            }}
          />
        </div>
        <IconButton className="filter-button">
          <FilterListIcon color="primary" />
        </IconButton>
      </div>
      <CustomDivider />
      <div className="legend-container">
        {filteredPatterns.map(({ name, formattedName, filePath }) => {
          return (
            <div className="facies-pattern-container" key={name}>
              <img className="legend-pattern" src={devSafeUrl(filePath)} />
              <Typography className="facies-pattern" color="primary">
                {formattedName}
              </Typography>
            </div>
          );
        })}
      </div>
    </StyledScrollbar>
  );
};
const DisplayLegendItem = ({ legendItem }: { legendItem: LegendItem }) => {
  const { color, label, icon: Icon } = legendItem;
  return (
    <Box className="legend-item-container">
      <Icon width={20} height={20} style={{ color: color }} mr={1} />
      <TypographyText className="legend-label">{label}</TypographyText>
    </Box>
  );
};
