import { action } from "mobx";
import { state } from "../state";
import { FaciesOptions } from "../../types";
import { setIsFullscreen } from "./general-actions";

/**
 * When user presses back button on the map we pop history and
 * reload settings. Additionally saves facies map settings if
 * current map is in facies mode.
 */
export const goBackInMapHistory = action("goBackInMapHistory", () => {
  const savedMap = state.mapState.mapHistory.accessHistory.pop();
  // save settings if they exist
  saveFaciesOptions(state.mapState.selectedMap, state.mapState.isFacies, state.mapState.currentFaciesOptions);
  // has user accessed a map previously
  if (savedMap) {
    const { name, isFacies } = savedMap;
    setSelectedMap(name);
    setIsFacies(isFacies);
    setFaciesOptions(name, isFacies);
  } else {
    closeMapViewer();
  }
});

/**
 * Close map viewer, and resets all settings, clears history
 */
export const closeMapViewer = action("closeMapViewer", () => {
  saveFaciesOptions(state.mapState.selectedMap, state.mapState.isFacies, state.mapState.currentFaciesOptions);
  state.mapState.mapHistory.accessHistory = [];
  setIsFacies(false);
  setIsLegendOpen(false);
  setSelectedMap(null);
  setIsMapViewerOpen(false);
  setFaciesOptions(null, false);
  setIsFullscreen(false);
});

/**
 * If the facies options have been saved before, access them.
 * Otherwise reset to default settings
 * Only saves if isFacies is true and name is not null
 * @param name the map name the history needs to be saved to
 * @param isFacies is the map in facies mode
 */
export const setFaciesOptions = action("setFaciesOptions", (name: string | null, isFacies: boolean) => {
  if (isFacies && name && state.mapState.mapHistory.savedHistory[name]) {
    state.mapState.currentFaciesOptions = state.mapState.mapHistory.savedHistory[name].faciesOptions;
  } else {
    state.mapState.currentFaciesOptions = { faciesAge: 0, dotSize: 1, presentRockTypes: new Set<string>() };
  }
  //map might not exist so put to 0
  state.mapState.selectedMapAgeRange = { minAge: 0, maxAge: 0 };
});
/**
 * Sets the selected minAge and maxAge of selectedMapAgeRange
 * @param minAge the minage to compare with the selectedMapAgeRange
 * @param maxAge the maxage to compare with the selectedMapAgeRange
 */
export const setSelectedMapAgeRange = action("setSelectedMapAgeRange", (minAge: number, maxAge: number) => {
  state.mapState.selectedMapAgeRange.minAge = Math.min(state.mapState.selectedMapAgeRange.minAge, minAge);
  state.mapState.selectedMapAgeRange.maxAge = Math.max(state.mapState.selectedMapAgeRange.maxAge, maxAge);
});

/**
 * Open the next map and starts the child with default options
 * @param current the current map name
 * @param isCurrentFacies the state of facies
 * @param next the name of the child to be opened
 * @param isNextFacies if the user requests facies or not facies
 */
export const openNextMap = action(
  "openNextMap",
  (current: string, isCurrentFacies: boolean, next: string, isNextFacies: boolean) => {
    state.mapState.mapHistory.accessHistory.push({ name: current, isFacies: isCurrentFacies });
    saveFaciesOptions(current, isCurrentFacies, state.mapState.currentFaciesOptions);
    setSelectedMap(next);
    setIsFacies(isNextFacies);
    setFaciesOptions(next, isNextFacies);
  }
);

/**
 * If is a facies map, and name is not null, save the facies settings to history
 * @param name the name of the map
 * @param isFacies is the map in facies mode
 * @param faciesOptions the facies options to save
 */
const saveFaciesOptions = action(
  "saveFaciesOptions",
  (name: string | null, isFacies: boolean, faciesOptions: FaciesOptions) => {
    if (isFacies && name) {
      state.mapState.mapHistory.savedHistory[name] = { faciesOptions };
    }
  }
);

/**
 * Set selected map
 */
export const setSelectedMap = action("setSelectedMap", (newMap: string | null) => {
  state.mapState.selectedMap = newMap;
});
export const setIsMapViewerOpen = action("setIsMapViewerOpen", (newval: boolean) => {
  state.mapState.isMapViewerOpen = newval;
});
export const setDotSize = action("setDotSize", (newval: number) => {
  state.mapState.currentFaciesOptions.dotSize = newval;
});
export const pushPresentRockType = action("pushPresentRockType", (rockType: string) => {
  state.mapState.currentFaciesOptions.presentRockTypes.add(rockType);
});
export const setFaciesAge = action("setFaciesAge", (newval: number) => {
  state.mapState.currentFaciesOptions.presentRockTypes.clear();
  state.mapState.currentFaciesOptions.faciesAge = newval;
});
export const setIsLegendOpen = action("setIsLegendOpen", (newval: boolean) => {
  state.mapState.isLegendOpen = newval;
});
const setIsFacies = action("setIsFacies", (newval: boolean) => {
  state.mapState.isFacies = newval;
});
