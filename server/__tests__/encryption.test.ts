jest.mock("glob", () => ({
    __esModule: true,
    glob: jest.fn().mockImplementation((pattern) => {
        const mockFiles = [
            "encrypted.txt",
            "unencrypted.txt",
        ];
        if (pattern.endsWith("**/*")) pattern = pattern.replace("**/*", ".*");
        return Promise.resolve(mockFiles.filter((path) => new RegExp(pattern).test(path)));
    })
}));


import {
    checkHeader
} from "../src/util";
describe("checkHeader", () => {
    test('checkHeader("default-encrypted") returns true', async () => {
        expect(await checkHeader("default-encrypted")).toEqual(
            true);
    });
    test('checkHeader("_data_/default-unencrypted") returns false', async () => {
        expect(await checkHeader("default-unencrypted")).toEqual(
            false);
    });
}); 