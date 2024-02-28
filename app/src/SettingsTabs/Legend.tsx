import { Box, IconButton, Typography, styled, useTheme } from "@mui/material";
import { useState, useContext, ChangeEvent, useRef, useEffect } from "react";
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
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { ControlledMenu, MenuCloseEvent, MenuItem, useClick, useMenuState } from "@szhsin/react-menu";
import { observer } from "mobx-react-lite";
import SimpleBarCore from "simplebar-core";
import { LEGEND_HEADER_HEIGHT } from "./MapPointConstants";

/**
 * This is the legend that describes the icons present on the
 * map viewer. Currently uses a legend item array inherently
 * @returns a component with a header and body of icons
 */
export const Legend = observer(() => {
  // the filters for the facies patterns
  const [searchValue, setSearchValue] = useState("");
  const [filterByPresent, setFilterByPresent] = useState(false);

  // for configuring menu with transition and onClose
  const [menuState, toggleMenu] = useMenuState({ transition: true });
  const anchorProps = useClick(menuState.state, toggleMenu);
  const menuRef = useRef(null);

  //scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<SimpleBarCore>(null);

  const theme = useTheme();
  const { state } = useContext(context);

  // allows us to track how far the user scrolls
  useEffect(() => {
    const scrollEl = scrollRef.current?.contentWrapperEl;
    function handleScroll(_event: Event) {
      if (scrollEl) {
        setIsScrolled(scrollEl.scrollTop > window.innerHeight * 0.8);
      }
    }
    scrollEl?.addEventListener("scroll", handleScroll);
    return () => {
      scrollEl?.removeEventListener("scroll", handleScroll);
    };
  });
  let filteredPatterns = Object.values(state.mapPatterns);
  filteredPatterns = filteredPatterns.filter((value) => {
    const isPresent = !filterByPresent || state.mapState.currentFaciesOptions.presentRockTypes.has(value.formattedName);
    const matchesSearch = value.formattedName.toLowerCase().includes(searchValue.toLowerCase());
    return isPresent && matchesSearch;
  });
  // legend icon array
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
    <>
      {isScrolled && (
        <IconButton
          className="scroll-top"
          style={{ top: `calc(${LEGEND_HEADER_HEIGHT} + 1vh)` }}
          onClick={() => {
            scrollRef.current?.contentWrapperEl?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          }}>
          <FilterListIcon color="primary" />
        </IconButton>
      )}
      <StyledScrollbar
        ref={scrollRef}
        style={{
          height: `calc(100vh - ${LEGEND_HEADER_HEIGHT})`,
          backgroundColor: theme.palette.navbar.main
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
          <IconButton ref={menuRef} className="filter-button" {...anchorProps}>
            <FilterListIcon color="primary" />
          </IconButton>
          <ControlledMenu
            {...menuState}
            menuStyle={{ backgroundColor: theme.palette.menuDropdown.main }}
            anchorRef={menuRef}
            onClose={(event: MenuCloseEvent) => {
              if (event.reason === "click") return;
              toggleMenu(false);
            }}>
            <CustomMenuItem
              checked={filterByPresent}
              onClick={() => setFilterByPresent(!filterByPresent)}
              type="checkbox">
              <TypographyText>Present in map</TypographyText>
            </CustomMenuItem>
          </ControlledMenu>
        </div>
        <CustomDivider />
        <div className="legend-container facies-container">
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
    </>
  );
});
const DisplayLegendItem = ({ legendItem }: { legendItem: LegendItem }) => {
  const { color, label, icon: Icon } = legendItem;
  return (
    <Box className="legend-item-container">
      <Icon width={20} height={20} style={{ color: color }} mr={1} />
      <TypographyText className="legend-label">{label}</TypographyText>
    </Box>
  );
};
const CustomMenuItem = styled(MenuItem)(({ theme }) => ({
  "&.szh-menu__item--hover": {
    backgroundColor: theme.palette.menuDropdown.light
  },
  "&.szh-menu__item--checked": {
    color: theme.palette.primary.main
  }
}));
