import { describe, expect, it } from "vitest";
import { ColumnInfo } from "@tsconline/shared";
import {
  applyHideDatapackDefaults,
  restoreColumnOnSnapshot,
  shouldPreserveColumnOn,
  snapshotColumnOnStates
} from "../src/util/default-column-map";
import type { RenderColumnInfo } from "../src/types";

function makeRenderColumn(overrides: Partial<RenderColumnInfo> & Pick<RenderColumnInfo, "name">): RenderColumnInfo {
  return {
    editName: overrides.name,
    fontsInfo: {} as RenderColumnInfo["fontsInfo"],
    fontOptions: [],
    on: true,
    popup: "",
    children: [],
    parent: "Chart Title",
    minAge: 0,
    maxAge: 10,
    show: true,
    expanded: false,
    enableTitle: true,
    columnDisplayType: "Event",
    columnRef: {} as ColumnInfo,
    isSelected: false,
    hasSelectedChildren: false,
    dispose: () => {},
    ...overrides
  } as RenderColumnInfo;
}

describe("default-column-map", () => {
  it("preserves structural columns when hiding defaults", () => {
    expect(shouldPreserveColumnOn(makeRenderColumn({ name: "Ma", columnDisplayType: "Ruler" }))).toBe(true);
    expect(shouldPreserveColumnOn(makeRenderColumn({ name: "Chart Title", columnDisplayType: "RootColumn" }))).toBe(
      true
    );
    expect(shouldPreserveColumnOn(makeRenderColumn({ name: "Microfossils" }))).toBe(false);
  });

  it("turns off datapack-default-on columns and keeps Ma", () => {
    const hashMap = new Map<string, RenderColumnInfo>([
      ["Ma", makeRenderColumn({ name: "Ma", columnDisplayType: "Ruler", on: true })],
      ["Events", makeRenderColumn({ name: "Events", on: true })],
      ["Ranges", makeRenderColumn({ name: "Ranges", on: false })]
    ]);
    const defaultMap = new Map<string, ColumnInfo>([
      ["Ma", { on: true } as ColumnInfo],
      ["Events", { on: true } as ColumnInfo],
      ["Ranges", { on: false } as ColumnInfo]
    ]);

    applyHideDatapackDefaults(hashMap, defaultMap);

    expect(hashMap.get("Ma")!.on).toBe(true);
    expect(hashMap.get("Events")!.on).toBe(false);
    expect(hashMap.get("Ranges")!.on).toBe(false);
  });

  it("restores from snapshot", () => {
    const hashMap = new Map<string, RenderColumnInfo>([["Events", makeRenderColumn({ name: "Events", on: false })]]);
    const snapshot = snapshotColumnOnStates(new Map([["Events", makeRenderColumn({ name: "Events", on: true })]]));

    restoreColumnOnSnapshot(hashMap, snapshot);
    expect(hashMap.get("Events")!.on).toBe(true);
  });
});
