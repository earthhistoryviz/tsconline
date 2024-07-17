import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runJavaEncrypt(activeJar: string, filepath: string, encryptedFilepathDir: string) {
  const cmdArgs = [
    "-jar",
    activeJar,
    "-d",
    filepath.replaceAll("\\", "/"),
    "-enc",
    encryptedFilepathDir.replaceAll("\\", "/"),
    "-node"
  ];

  console.log("Calling Java encrypt.jar: ", cmdArgs.join(" "));

  try {
    const { stdout, stderr } = await execFileAsync("java", cmdArgs);
    if (stderr) {
      console.error("Java stderr: " + stderr);
    }
    console.log("Java stdout: " + stdout);
  } catch (e) {
    console.error("Java error: " + e);
  }
}
