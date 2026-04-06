import { describe, it, expect } from "vitest";
import { applyTogglesToColumnInfo } from "../src/settings-generation/build-settings";
import { defaultFontsInfo, ColumnInfo } from "@tsconline/shared";

const buildFakeColumn = (): ColumnInfo => ({
  name: "Nigeria Coast",
  editName: "Nigeria Coast",
  fontsInfo: defaultFontsInfo,
  fontOptions: ["Column Header"],
  popup: "",
  on: true,
  width: 100,
  enableTitle: true,
  rgb: { r: 255, g: 255, b: 255 },
  minAge: 0,
  maxAge: 0,
  children: [],
  parent: "Chart Root",
  units: "Ma",
  columnDisplayType: "Facies",
  show: true,
  expanded: true
});

describe("build-settings applyTogglesToColumnInfo", () => {
  it("applies width by user-friendly name (case-insensitive)", () => {
    const root: ColumnInfo = {
      name: "Chart Root",
      editName: "Chart Root",
      fontsInfo: defaultFontsInfo,
      fontOptions: ["Column Header"],
      popup: "",
      on: true,
      width: 100,
      enableTitle: true,
      rgb: { r: 255, g: 255, b: 255 },
      minAge: 0,
      maxAge: 0,
      children: [buildFakeColumn()],
      parent: null,
      units: "Ma",
      columnDisplayType: "RootColumn",
      show: true,
      expanded: true
    };

    applyTogglesToColumnInfo(root, { "nigeria coast": { width: 123 } });
    expect(root.children[0].width).toBe(123);
  });

  it("applies width when key is full class namespace id", () => {
    const root: ColumnInfo = {
      name: "Chart Root",
      editName: "Chart Root",
      fontsInfo: defaultFontsInfo,
      fontOptions: ["Column Header"],
      popup: "",
      on: true,
      width: 100,
      enableTitle: true,
      rgb: { r: 255, g: 255, b: 255 },
      minAge: 0,
      maxAge: 0,
      children: [buildFakeColumn()],
      parent: null,
      units: "Ma",
      columnDisplayType: "RootColumn",
      show: true,
      expanded: true
    };

    applyTogglesToColumnInfo(root, { "class datastore.FaciesColumn:Nigeria Coast": { width: 130 } });
    expect(root.children[0].width).toBe(130);
  });
});
