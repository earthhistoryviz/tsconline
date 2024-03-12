export type AssetConfig = {
  activeJar: string;
  activeDatapacks: string[];
  decryptionJar: string;
  decryptionDirectory: string;
  datapacksDirectory: string;
  chartsDirectory: string;
  imagesDirectory: string;
  timescaleFilepath: string;
  patternsDirectory: string;
  colors: string;
};

export type Colors = {
  [color: string]: string;
};

export function assertColors(o: any): asserts o is Colors {
  if (typeof o !== "object" || !o) throw "AssetConfig must be an object";
  for (const color in o) {
    if (typeof color !== "string") throw 'Colors must have a "color" key that is a string';
    if (typeof o[color] !== "string") throw "Colors must have a indexed value with type string";
  }
}

export function assertAssetConfig(o: any): asserts o is AssetConfig {
  if (typeof o !== "object" || !o) throw "AssetConfig must be an object";
  if (typeof o.activeJar !== "string") throw 'AssetConfig must have an "activeJar" string';
  if (typeof o.decryptionJar !== "string") throw 'AssetConfig must have a "decryptionJar" string';
  if (typeof o.decryptionDirectory !== "string") throw 'AssetConfig must have a "decryptionDirectory" string';
  if (typeof o.datapacksDirectory !== "string") throw 'AssetConfig must have a "datapackDirectory" string';
  if (typeof o.chartsDirectory !== "string") throw 'AssetConfig must have a "chartsDirectory" string';
  if (typeof o.imagesDirectory !== "string") throw 'AssetConfig must have a "imagesDirectory" string';
  if (typeof o.patternsDirectory !== "string") throw 'AssetConfig must have a "patternsDirectory" string';
  if (typeof o.colors !== "string") throw 'AssetConfig must have a "colors" string';
  if (!o.activeDatapacks || !Array.isArray(o.activeDatapacks)) throw 'AssetConfig must have an "activeJar" string';
  for (const [index, ad] of o.activeDatapacks.entries()) {
    if (typeof ad !== "string") throw "AssetConfig activeDatapacks item " + index + " must be a string";
  }
  if (typeof o.timescaleFilepath !== "string") throw 'AssetConfig must have a "timescaleFilepath" string';
}
