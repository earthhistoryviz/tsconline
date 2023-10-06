import { action, runInAction } from 'mobx';
import { type ChartConfig, assertChartInfo, isChartError } from '@tsconline/shared';
import { state, State } from './state';
import { fetcher, devSafeUrl } from '../util';
import { xmlToJson , jsonToXml } from './settingsParser';

export const setTab = action('setTab', (newval: number) => {
  state.tab = newval;
});

export const setChart = action('setChart', async (newval: number) => {
  if (state.presets.length <= newval) { 
    state.chart = null;
    return;
  }
  state.chart = state.presets[newval]!;
  // Grab the settings for this chart if there are any:
  if (state.chart.settings) {
    const response = await fetcher(state.chart.settings);
    const xml = await response.text();
    if (typeof xml === 'string' && xml.match(/<TSCreator/)) {
      // Call the xmlToJsonParser function here
      const jsonSettings = xmlToJson(xml);
      runInAction(() => state.settingsJSON = jsonSettings); // Save the parsed JSON to the state.settingsJSON
      console.log("Parsed JSON Object:", jsonSettings); 
    } else {
      console.log('WARNING: grabbed settings from server at url: ', devSafeUrl(state.chart.settings), ', but it was either not a string or did not have a <TSCreator tag in it');
      console.log('The returned settingsXML was: ', xml);
    }
  }
});

export const setAllTabs = action('setAllTabs', (newval: boolean) => {
  state.showAllTabs = newval;
})

export const generateChart = action('generateChart', async () => {
  const xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  console.log('XML Settings:', xmlSettings); // Log the XML settings to the console
  const body = JSON.stringify({
    settings: xmlSettings,
  });
  console.log('Sending settings to server...');
  const response = await fetcher('/charts', { 
    method: 'POST',
    body,
  });
  const answer = await response.json();
  try {
    assertChartInfo(answer);
    runInAction(() => state.chartPath = devSafeUrl(answer.chartpath));
  } catch(e: any) {
    if (isChartError(answer)) {
      console.log('ERROR failed to fetch chart with the settings.  Error response from server was: ', answer);
      return;
    }
    console.log('ERROR: unknown error in fetching chart with settings.  Response from server was: ', answer, ', Error was: ', e);
    return;
  }
});

export const loadPresets = action('loadPresets', (presets: ChartConfig[]) => {
  state.presets = presets;
  setChart(0);
});

export const settingsXML = action('settingsXML', (xml: string) => {
  state.settingsXML = xml;
});


//update
export const updateSettings = action('updateSettings', () => {
  const { topAge, baseAge, unitsPerMY } = state.settings;
  const jsonSettings = state.settingsJSON;

  if ('settings' in jsonSettings) {
    const settings = jsonSettings.settings as any;
    settings['topAge']['text'] = topAge.toString();
    settings['baseAge']['text'] = baseAge.toString();
    settings['unitsPerMY'] = (unitsPerMY * 30).toString();
  }

  const xmlSettings = jsonToXml(jsonSettings); // Convert JSON to XML using jsonToXml function

  console.log('Updated settingsXML:', xmlSettings); // Print the updated XML

  state.settingsXML = xmlSettings;
});


//update the checkboxes
// Define settingOptions globally
export const settingOptions = [
  { name: 'enablePopups', label: 'Enable popups', stateName: 'doPopups' },
  { name: 'enablePriorityFiltering', label: 'Enable priority filtering', stateName: 'enPriority' },
  { name: 'enableChartLegend', label: 'Enable chart legend', stateName: 'enChartLegend' },
  { name: 'hideBlockLabelsIfCrowded', label: 'If crowded, hide block labels', stateName: 'enHideBlockLable' },
  { name: 'skipEmptyColumns', label: 'Skip empty columns', stateName: 'skipEmptyColumns' },
];

// Combined function to update the checkbox settings and individual action functions
export const updateCheckboxSetting = action((stateName: string, checked: boolean) => {
  // Check if the stateName is a valid setting option
  const settingOption = settingOptions.find((option) => option.stateName === stateName);
  if (!settingOption) return;

  // Update the checkbox setting in state.settings
  (state.settings as any)[stateName] = checked;

  // Update the checkbox setting in jsonSettings['settings'] if available
  if (state.settingsJSON['settings']) {
    const settings = state.settingsJSON['settings'];
    // Check if the current setting is already equal to the new value
    if (settings[stateName] !== checked) {
      settings[stateName] = checked;
    }
  }

  // Log the updated setting
  console.log(`Updated setting "${stateName}" to ${checked}`);
});


export const setTopAge = action((topage: number) => {
  state.settings.topAge = topage;
});

export const setBaseAge = action((baseage: number) => {
  state.settings.baseAge=  baseage;
});

export const setUnitsPerMY = action((units: number) => {
  state.settings.unitsPerMY = units;
});


export const setSettingTabsSelected = action((newtab: number | State['settingsTabs']['selected']) => {
  if (typeof newtab === 'string')  {
    state.settingsTabs.selected = newtab;
    return;
  }
  switch (newtab) {
    case 0: state.settingsTabs.selected = 'time'; break;
    case 1: state.settingsTabs.selected = 'column'; break;
    case 2: state.settingsTabs.selected = 'font'; break;
    case 3: state.settingsTabs.selected = 'mappoints'; break;
    default:
      console.log('WARNING: setSettingTabsSelected: received index number that is unknown: ', newtab);
      state.settingsTabs.selected = 'time';
  }
});

export function translateTabToIndex(tab: State['settingsTabs']['selected']) {
  switch(tab) {
    case 'time': return 0;
    case 'column': return 1;
    case 'font': return 2;
    case 'mappoints': return 3;
  }
}
