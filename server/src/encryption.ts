import { spawn } from "child_process";

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

  return new Promise<void>((resolve) => {
    const child = spawn("java", cmdArgs);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`Java process exited with code ${code}`);
        console.error("Java stderr: " + stderr);
      }
      console.log("Java stdout: " + stdout);
      resolve();
    });
  });
}
