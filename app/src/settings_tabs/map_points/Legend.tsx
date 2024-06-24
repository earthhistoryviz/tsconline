import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import React, { useState, useContext, ChangeEvent, useRef, useEffect } from "react";
import {
  StyledScrollbar,
  CustomHeader,
  CustomDivider,
  TypographyText,
  TSCTextField,
  TSCInputAdornment,
  Lottie,
  TSCMenuItem,
  TSCSubMenu
} from "../../components";
import { context } from "../../state";
import { LegendItem } from "../../types";
import { devSafeUrl } from "../../util";
import { AvailableIcon, DisabledIcon, InfoIcon, ChildMapIcon } from "./MapButtons";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import "./Legend.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { ControlledMenu, MenuDivider, useClick, useMenuState } from "@szhsin/react-menu";
import { observer } from "mobx-react-lite";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import SimpleBarCore from "simplebar-core";
import ArrowUpIcon from "../../assets/icons/arrow-up.json";
import { LegendHeaderHeight } from "./MapPointConstants";
import { Color, Patterns } from "@tsconline/shared";

/**
 * This is the legend that describes the icons present on the
 * map viewer. Currently uses a legend item array inherently
 * @returns a component with a header and body of icons
 */
export const Legend = observer(() => {
  // the filters for the facies patterns
  const [searchValue, setSearchValue] = useState("");
  const [filterByPresent, setFilterByPresent] = useState(true);
  const [alphabeticalSort, setAlphabeticalSort] = useState(true);
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set<string>());

  //scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<SimpleBarCore>(null);

  const theme = useTheme();
  const { state } = useContext(context);

  function toggleColor(color: string) {
    if (colorFilter.has(color)) {
      colorFilter.delete(color);
      setColorFilter(new Set(colorFilter));
    } else {
      setColorFilter(new Set([...colorFilter, color]));
    }
  }
  function clearFilter() {
    setColorFilter(new Set<string>());
    setFilterByPresent(false);
    setAlphabeticalSort(false);
  }

  // allows us to track how far the user scrolls
  useEffect(() => {
    const scrollEl = scrollRef.current?.contentWrapperEl;
    function handleScroll() {
      if (scrollEl) {
        setIsScrolled(scrollEl.scrollTop > window.innerHeight * 0.8);
      }
    }
    scrollEl?.addEventListener("scroll", handleScroll);
    return () => {
      scrollEl?.removeEventListener("scroll", handleScroll);
    };
  });
  const colors = new Set<string>();
  const colorHash = new Map<string, Color>();
  const patterns = alphabeticalSort ? state.mapPatterns.sortedPatterns : state.mapPatterns.patterns;
  const filteredPatterns = Object.values(patterns).filter((value) => {
    const isPresent = !filterByPresent || state.mapState.currentFaciesOptions.presentRockTypes.has(value.formattedName);
    const matchesSearch = value.formattedName.toLowerCase().includes(searchValue.toLowerCase());
    const hasColor = colorFilter.size == 0 || colorFilter.has(value.color.name);
    // load these to display all available colors for the certain context
    if (isPresent && matchesSearch) {
      colors.add(value.color.name);
      colorHash.set(value.color.name, value.color);
    }
    return isPresent && matchesSearch && hasColor;
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
  const menuStyle = {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.menuDropdown.main
  };

  return (
    <>
      <IconButton
        className={`scroll-top ${isScrolled ? "show" : ""}`}
        style={{ top: `calc(${LegendHeaderHeight} + 1vh)` }}
        onClick={() => {
          scrollRef.current?.contentWrapperEl?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }}
        size="large">
        <Lottie key="legend-arrow-up" width="inherit" height="inherit" animationData={ArrowUpIcon} playOnClick />
      </IconButton>
      <StyledScrollbar
        ref={scrollRef}
        autoHide={false}
        style={{
          height: `calc(100vh - ${LegendHeaderHeight})`,
          backgroundColor: theme.palette.secondaryBackground.main
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
          <FaciesSearchBar searchValue={searchValue} setSearchValue={setSearchValue} />
          <div className="filters">
            <FilterMenu
              style={menuStyle}
              colors={colors}
              colorFilter={colorFilter}
              colorHash={colorHash}
              filterByPresent={filterByPresent}
              alphabeticalSort={alphabeticalSort}
              setAlphabeticalSort={setAlphabeticalSort}
              setFilterByPresent={setFilterByPresent}
              toggleColor={toggleColor}
            />
            <Button onClick={() => clearFilter()} className="filter-button">
              <TypographyText>Clear Filter</TypographyText>
            </Button>
          </div>
        </div>
        <CustomDivider />
        <FaciesPatterns patterns={filteredPatterns} />
      </StyledScrollbar>
    </>
  );
});

type FilterMenuProps = {
  style: React.CSSProperties;
  colors: Set<string>;
  colorFilter: Set<string>;
  colorHash: Map<string, Color>;
  filterByPresent: boolean;
  alphabeticalSort: boolean;
  setAlphabeticalSort: (sort: boolean) => void;
  setFilterByPresent: (set: boolean) => void;
  toggleColor: (color: string) => void;
};

const FilterMenu: React.FC<FilterMenuProps> = observer(
  ({
    style,
    colors,
    filterByPresent,
    colorFilter,
    alphabeticalSort,
    colorHash,
    setAlphabeticalSort,
    setFilterByPresent,
    toggleColor
  }) => {
    // for configuring menu with transition and onClose
    const [menuState, toggleMenu] = useMenuState({ transition: true });
    const anchorProps = useClick(menuState.state, toggleMenu);
    const menuRef = useRef(null);
    const { state } = useContext(context);
    return (
      <>
        <IconButton ref={menuRef} className="filter-button" {...anchorProps} size="large">
          <FilterListIcon color="primary" />
        </IconButton>
        <ControlledMenu
          {...menuState}
          viewScroll="close"
          portal={!state.isFullscreen}
          className="filter-menu"
          menuStyle={style}
          anchorRef={menuRef}
          onClose={(event) => {
            if (event.reason === "click") return;
            toggleMenu(false);
          }}>
          <TSCMenuItem
            checked={alphabeticalSort}
            onClick={() => setAlphabeticalSort(!alphabeticalSort)}
            type="checkbox">
            <TypographyText>Sort A-Z</TypographyText>
          </TSCMenuItem>
          <TSCMenuItem checked={filterByPresent} onClick={() => setFilterByPresent(!filterByPresent)} type="checkbox">
            <TypographyText>Present in map</TypographyText>
          </TSCMenuItem>
          <MenuDivider />
          <ColorSubMenu
            colorHash={colorHash}
            style={style}
            colors={colors}
            colorFilter={colorFilter}
            toggleColor={toggleColor}
          />
        </ControlledMenu>
      </>
    );
  }
);

type FaciesSearchBarProps = {
  searchValue: string;
  setSearchValue: (search: string) => void;
};

const FaciesSearchBar: React.FC<FaciesSearchBarProps> = ({ searchValue, setSearchValue }) => {
  return (
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
  );
};

type ColorSubMenuProps = {
  style: React.CSSProperties;
  colors: Set<string>;
  colorFilter: Set<string>;
  colorHash: Map<string, Color>;
  toggleColor: (color: string) => void;
};

const ColorSubMenu: React.FC<ColorSubMenuProps> = ({ colorHash, style, colors, colorFilter, toggleColor }) => {
  return (
    <TSCSubMenu className="color-menu" menuStyle={style} label={SubMenuIcon}>
      {Array.from(colors).map((color) => (
        <TSCMenuItem
          className="sub-menu-item"
          key={color}
          checked={colorFilter.has(color)}
          onClick={() => toggleColor(color)}
          type="checkbox">
          <>
            <TypographyText key={color} className="color-text">
              {color}
            </TypographyText>
            <div className="colored-box" style={{ backgroundColor: colorHash.get(color)?.hex }} />
          </>
        </TSCMenuItem>
      ))}
    </TSCSubMenu>
  );
};

type FaciesPatternsProps = {
  patterns: Patterns[string][];
};
const FaciesPatterns: React.FC<FaciesPatternsProps> = ({ patterns }) => {
  return (
    <div className="legend-container facies-container">
      {patterns.map(({ name, formattedName, filePath }) => {
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
  );
};

const SubMenuIcon = () => (
  <>
    <ColorLensIcon className="color-lens-icon" />
    <TypographyText>Color</TypographyText>
  </>
);

const DisplayLegendItem = ({ legendItem }: { legendItem: LegendItem }) => {
  const { color, label, icon: Icon } = legendItem;
  return (
    <Box className="legend-item-container">
      <Icon width={20} height={20} style={{ color: color }} mr={1} />
      <TypographyText className="legend-label">{label}</TypographyText>
    </Box>
  );
};
