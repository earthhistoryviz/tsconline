import * as runJavaEncryptModule from "../src/encryption"
import { access, readFile } from "fs/promises";
import { vi, beforeAll, afterAll, describe, beforeEach, it, expect, test } from "vitest";

vi.mock('../src/encryption', async (importOriginal) => {
    const actual = await importOriginal<typeof runJavaEncryptModule>();
    return {
        ...actual
    }
});

async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch (error) {
        console.log("hey");
        return false;
    }
}

describe('runJavaEncrypt', () => {
    it('should correctly encrypt an unencrypted TSCreator txt file', async () => {
        if (!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-1.txt")) {
            console.log("here")
            await runJavaEncryptModule.runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_09June2024.jar", "server/_test_/_data_/encryption-test-1.txt", "server/_test_/_data_/encryption-test-generated-file")
            console.log("finished");
        }
        const resultFilePath = 'server/_test_/_data_/encryption-test-generated-file/encryption-test-1.txt';
        const keyFilePath = 'server/_test_/_data_/encryption-test-keys/test-1-key.txt';
        const [result, key] = await Promise.all([
            readFile(resultFilePath),
            readFile(keyFilePath)
        ]);
        expect(result).toEqual(key);
        // Compare the byte size (length)
        expect(result.length).toBe(key.length);
    });

});