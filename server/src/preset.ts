import { readFile } from 'fs/promises';
import { glob } from 'glob';
import pmap from 'p-map';
import { type Preset, assertChartConfig  } from '@tsconline/shared';

export async function loadPresets(): Promise<Preset[]> {
  // Build the list of presets from the filesystem:
  const chartconfig_paths = await glob(`public/presets/*-*/config.json`);
  // Sort them alphabetically:
  chartconfig_paths.sort();
  // Load all the configs out of all the files in public/presets:
  return pmap(chartconfig_paths, async (chartconfig) => {
    try { 
      const cfg = JSON.parse((await readFile(chartconfig)).toString());
      assertChartConfig(cfg);
      // Prefix the image paths with the proper directory from public:
      cfg.img = '/' + chartconfig.replace(/config.json$/,cfg.img);
      if (cfg.settings) {
        cfg.settings = '/' + chartconfig.replace(/config.json$/,cfg.settings);
      }
      return cfg;
    } catch (e: any) {
      const msg = 'ERROR: failed to read chart config for path '+chartconfig+'.  Error was: ';
      console.log(msg, e);
      return { error: msg + e.toString() };
    }
  });
}


