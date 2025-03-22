import { it, describe, beforeEach, vi, expect } from "vitest"

import { getMarkersFromTextFile } from "../src/crossplot/extract-markers";
import * as fs from "fs";
import * as readline from "readline";
import * as util from "../src/util";
import * as shared from "@tsconline/shared";

vi.mock("fs", async () => {
    return {
        createReadStream: vi.fn().mockReturnValue({
            setEncoding: vi.fn(),
            on: vi.fn(),
        }),
    };
});

vi.mock("readline", async () => {
    return {
        createInterface: vi.fn().mockReturnValue({
            
            on: vi.fn(),
        }),
    }
});
vi.mock("../src/util", async () => {
    return {
        verifyFilepath: vi.fn().mockResolvedValue(true),
    };
});

vi.mock("@tsconline/shared", async () => {
    return {
        getMarkerTypeFromNum: vi.fn().mockReturnValue("test"),
    };
});


describe("extractMarkers", async () => {
    const verifyFilepath = vi.spyOn(util, "verifyFilepath");
    const getMarkerTypeFromNum = vi.spyOn(shared, "getMarkerTypeFromNum");
    const createReadStream = vi.spyOn(fs, "createReadStream");
    const createInterface = vi.spyOn(readline, "createInterface");
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it("should throw an error if createReadStream throws an error", async () => {
        createReadStream.mockImplementationOnce(() => {
            throw new Error("Error reading file")
        });
        await expect(getMarkersFromTextFile("test")).rejects.toThrow("Error reading file")
    });
});