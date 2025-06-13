import { describe, test, expect, it } from "vitest";
import { roundToDecimalPlace, calculateAutoScale, checkUserAllowedDownloadDatapack } from "../src/util";
import { DatapackMetadata, SharedUser, getWorkshopUUIDFromWorkshopId } from "../src";

describe("roundToDecimalPlace tests", () => {
  test.each([
    [1.234567, 2, 1.23],
    [1.234567, 3, 1.235],
    [1.234567, 4, 1.2346],
    [1.234567, 5, 1.23457]
  ])("roundToDecimalPlace(%p, %p) should return %p", (value, decimalPlace, expected) => {
    const result = roundToDecimalPlace(value, decimalPlace);
    expect(result).toBe(expected);
  });
});

describe("calculateAutoScale tests", () => {
  test.each([
    [0, 10, { lowerRange: -0.5, upperRange: 10.5, scaleStep: 2.2, scaleStart: 0 }],
    [0, 100, { lowerRange: -5, upperRange: 105, scaleStep: 22, scaleStart: 0 }],
    [0, 1000, { lowerRange: -50, upperRange: 1050, scaleStep: 220, scaleStart: 0 }],
    [0, 9, { lowerRange: -0.45, upperRange: 9.45, scaleStep: 1.98, scaleStart: 0 }],
    [-8, 8, { lowerRange: -8.8, upperRange: 8.8, scaleStep: 3.52, scaleStart: 0 }]
  ])("calculateAutoScale(%p, %p) should return %p", (min, max, expected) => {
    const result = calculateAutoScale(min, max);
    expect(result).toEqual(expected);
  });
});

describe("checkUserAllowedDownloadDatapack tests", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const testUser: SharedUser = {
    uuid,
    email: "test@example.com",
    username: "testuser",
    pictureUrl: "https://example.com/picture.jpg",
    isAdmin: false,
    isGoogleUser: false,
    accountType: "",
    historyEntries: []
  };
  const testOfficialDatapack: DatapackMetadata = {
    description: "description",
    title: "Title",
    originalFileName: "file.dpk",
    storedFileName: "tempFileName",
    size: "size",
    tags: [],
    authoredBy: "authoredBy",
    references: [],
    datapackImage: "image",
    isPublic: true,
    type: "official",
    priority: 0,
    hasFiles: false
  };

  const testPrivateDatapack: DatapackMetadata = {
    ...testOfficialDatapack,
    isPublic: false,
    type: "user",
    uuid
  };

  it("should allow admin users to download any datapack", () => {
    const adminUser = { ...testUser, isAdmin: true };
    expect(checkUserAllowedDownloadDatapack(adminUser, testOfficialDatapack)).toBe(true);
  });

  it("should allow download if the datapack is public", () => {
    expect(checkUserAllowedDownloadDatapack(testUser, testOfficialDatapack)).toBe(true);
  });

  it("should allow user to download their own datapack", () => {
    expect(checkUserAllowedDownloadDatapack(testUser, testPrivateDatapack)).toBe(true);
  });

  it("should not allow user to download another user's private datapack", () => {
    const privateDatapack: DatapackMetadata = { ...testPrivateDatapack, type: "user", uuid: "another-uuid" };
    expect(checkUserAllowedDownloadDatapack(testUser, privateDatapack)).toBe(false);
  });

  it("should not allow user to download a private official datapack", () => {
    const privateOfficialDatapack: DatapackMetadata = { ...testOfficialDatapack, isPublic: false, type: "official" };
    expect(checkUserAllowedDownloadDatapack(testUser, privateOfficialDatapack)).toBe(false);
  });
});
describe("getWorkshopUUIDFromWorkshopId", () => {
  it("should return the correct workshop UUID for a given workshop ID", () => {
    const workshopId = 12345;
    const result = getWorkshopUUIDFromWorkshopId(workshopId);
    expect(result).toBe("workshop-12345");
  });
});
