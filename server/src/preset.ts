import { readFile } from "fs/promises";
import { glob } from "glob";
import pmap from "p-map";
import { type Presets, assertChartConfig, ServerResponseError } from "@tsconline/shared";

export async function loadPresets(): Promise<Presets | ServerResponseError> {
  // Build the list of presets from the filesystem:
  let chartConfigPaths = await glob(`public/presets/*-*/config.json`);
  // this needs to be included to work on certain window machines
  chartConfigPaths = chartConfigPaths.map((path) => path.replace(/\\/g, "/"));
  // Sort them alphabetically:
  chartConfigPaths.sort();
  // Load all the configs out of all the files in public/presets:
  const parsedConfigs = await pmap(chartConfigPaths, async (chartconfig) => {
    try {
      const cfg = JSON.parse((await readFile(chartconfig)).toString());
      assertChartConfig(cfg);
      // Prefix the image paths with the proper directory from public:
      cfg.icon = "/" + chartconfig.replace(/config.json$/, cfg.icon);
      cfg.background = "/" + chartconfig.replace(/config.json$/, cfg.background);
      if (cfg.settings) {
        cfg.settings = chartconfig.replace(/config.json$/, cfg.settings);
      }
      return cfg;
    } catch (e) {
      const msg = "ERROR: failed to read chart config for path " + chartconfig + ".  Error was: ";
      console.log(msg, e);
      return { error: msg + e };
    }
  });
  const presets: Presets = { BASIC: [] };
  try {
    parsedConfigs.map((chartconfig) => {
      assertChartConfig(chartconfig);
      if ("type" in chartconfig) {
        if (!presets[chartconfig.type!]) presets[chartconfig.type!] = [];
        presets[chartconfig.type!]!.push(chartconfig);
      } else {
        presets["BASIC"]!.push(chartconfig);
      }
    });
    return presets;
  } catch (e) {
    const msg = `Failed to distribute chartconfigs to their appropriate types with error: ${e}`;
    console.log(msg);
    return { error: msg };
  }
}
