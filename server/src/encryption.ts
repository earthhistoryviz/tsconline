import { execFileSync } from "child_process";

export async function runJavaEncrypt(activeJar: string, filepath: string, encryptedFilepathDir: string) {
  return new Promise<void>((resolve) => {
    const cmd =
      `java -jar ${activeJar} ` +
      // datapacks:
      `-d "${filepath.replaceAll("\\", "/")}" ` +
      // Tell it where to send the datapacks
      `-enc ${encryptedFilepathDir.replaceAll("\\", "/")} ` +
      `-node`;

    // java -jar <jar file> -d <datapack> <datapack> -enc <destination directory> -node
    console.log("Calling Java encrypt.jar: ", cmd);
    try {
      const stdout = execFileSync("java", [
        "-jar",
        activeJar,
        "-d",
        filepath.replaceAll("\\", "/"),
        "-enc",
        encryptedFilepathDir,
        "-node"
      ]);
      console.log("Java stdout: " + stdout.toString());
    } catch (e) {
      console.error("Java error param: " + e);
    }
    resolve();
  });
}
