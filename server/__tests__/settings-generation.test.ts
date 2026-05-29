import { describe, it, expect } from "vitest";
import { applyTogglesToColumnInfo, extractUnitScopedTimeOverrides } from "../src/settings-generation/build-settings";
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
  columnDisplayType: "Facies"
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

  it("applies toggles when key is a dotted hierarchy path", () => {
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

    applyTogglesToColumnInfo(root, { "Planetary Time Scale.Moon.Nigeria Coast": { on: false, width: 140 } });
    expect(root.children[0].on).toBe(false);
    expect(root.children[0].width).toBe(140);
  });

  it("applies toggles when key is extra-quoted and dotted", () => {
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

    applyTogglesToColumnInfo(root, { '"Planetary Time Scale.Moon.Nigeria Coast"': { width: 150 } });
    expect(root.children[0].width).toBe(150);
  });

  it("turns ancestor groups on when a child column is toggled on", () => {
    const child = buildFakeColumn();
    child.name = "Period (Lunar)";
    child.editName = "Period (Lunar)";
    child.on = false;

    const parent: ColumnInfo = {
      ...buildFakeColumn(),
      name: "Planetary Time Scale",
      editName: "Planetary Time Scale",
      on: false,
      children: [child]
    };

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
      children: [parent],
      parent: null,
      units: "Ma",
      columnDisplayType: "RootColumn",
      show: true,
      expanded: true
    };

    applyTogglesToColumnInfo(root, { '"Period (Lunar)"': { on: true } });
    expect(parent.on).toBe(true);
    expect(child.on).toBe(true);
  });
});

describe("build-settings extractUnitScopedTimeOverrides", () => {
  it("extracts unit-scoped top/base ages from MCP/browser-style override keys", () => {
    const overrides = extractUnitScopedTimeOverrides({
      topAge_Ma: 0,
      baseAge_Ma: 20,
      topAge_ka: 100,
      unitsPerMY: [{ unit: "Ma", value: 2 }]
    });

    expect(overrides.topAgeByUnit.get("ma")).toBe(0);
    expect(overrides.baseAgeByUnit.get("ma")).toBe(20);
    expect(overrides.topAgeByUnit.get("ka")).toBe(100);
    expect(overrides.baseAgeByUnit.has("ka")).toBe(false);
  });
});
