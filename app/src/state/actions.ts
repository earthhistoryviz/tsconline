import { action, runInAction } from 'mobx';
import { type ChartConfig, assertChartInfo, isChartError } from '@tsconline/shared';
import { state } from './state';
import { fetcher, devSafeUrl } from '../util';

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
      runInAction(() => state.settingsXML = xml);
    } else {
      console.log('WARNING: grabbed settings from server at url: ', devSafeUrl(state.chart.settings), ', but it was either not a string or did not have a <TSCreator tag in it');
      console.log('The returned settignsXML was: ', xml);
    }
  }
});

export const setAllTabs = action('setAllTabs', (newval: boolean) => {
  state.showAllTabs = newval;
})

export const generateChart = action('generateChart', async () => {
  const body = JSON.stringify({
    settings: state.settingsXML,
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
    console.log('ERROR: unkonwn error in fetching chart with settings.  Response from server was: ', answer, ', Error was: ', e);
    return;
  }
})


export const loadPresets = action('loadPresets', (presets: ChartConfig[]) => {
  state.presets = presets;
  setChart(0);
});


export const settingsXML = action('settingsXML', (xml: string) => {
  state.settingsXML = xml;
});


//update
export const updateSettingsXML = action('updateSettingsXML', () => {
  const { topAge, baseAge } = state.settings;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(state.settingsXML, 'application/xml');

  const topAgeNode = xmlDoc.querySelector('setting[name="topAge"] > setting[name="text"]');
  if (topAgeNode) {
    topAgeNode.textContent = topAge.toString();
    console.log('topAge new in update ->', topAge);
  }

  const baseAgeNode = xmlDoc.querySelector('setting[name="baseAge"] > setting[name="text"]');
  if (baseAgeNode) {
    baseAgeNode.textContent = baseAge.toString();
    console.log('baseAge new in update ->', baseAge);
  }

  const serializer = new XMLSerializer();
  const updatedXML = serializer.serializeToString(xmlDoc);

  console.log('Updated settingsXML:', updatedXML); // Print the updated XML

  state.settingsXML = updatedXML;
});

