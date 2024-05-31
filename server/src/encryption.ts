import { assetconfigs } from "./index.js";
import { exec } from "child_process";

export async function runJavaEncrypt(filepath: string, encryptedFilepathDir: string) {
    return new Promise<void>((resolve, reject) => {
        const cmd =
            `java -jar ${assetconfigs.activeJar} ` +
            `-d "${filepath.replaceAll("\\", "/")}" ` +
            `-enc ${encryptedFilepathDir.replaceAll("\\", "/")} ` +
            `-node`;

        console.log("Calling Java encrypt.jar: ", cmd);
        exec(cmd, function (error, stdout, stderror) {
            console.log("Java encrypt.jar finished, sending reply to browser");
            if (error) {
                console.error("Java error param: " + error);
                console.error("Java stderr: " + stderror.toString());
                reject(error);
            } else {
                console.log("Java stdout: " + stdout.toString());
                resolve();
            }
        });
    });
}