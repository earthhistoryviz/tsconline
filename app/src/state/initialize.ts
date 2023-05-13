import { assertChartConfigArray } from '@tsconline/shared';
import { actions } from './index'
import { fetcher } from '../util';

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  try {
    const response = await fetcher('/presets');
    const presets = await response.json();
    console.log('Received response from server for presets: ', presets);
    assertChartConfigArray(presets);
    actions.loadPresets(presets);
    console.log('Presets loaded');
  } catch(e: any) {
    console.log('FAILED to retrieve presets.  Error was: ', e);
  }
}
