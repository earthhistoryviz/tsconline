// import { execFile } from "child_process";

// export async function runJavaEncrypt(activeJar: string, filepath: string, encryptedFilepathDir: string) {
//   return await new Promise<void>((resolve) => {
//     const cmd =
//       `java -jar ${activeJar} ` +
//       // datapacks:
//       `-d "${filepath.replaceAll("\\", "/")}" ` +
//       // Tell it where to send the datapacks
//       `-enc ${encryptedFilepathDir.replaceAll("\\", "/")} ` +
//       `-node`;

//     // java -jar <jar file> -d <datapack> <datapack> -enc <destination directory> -node
//     console.log("Calling Java encrypt.jar: ", cmd);

//     try {
//       const {stdout} = execFile("java", [
//         "-jar",
//         activeJar,
//         "-d",
//         filepath.replaceAll("\\", "/"),
//         "-enc",
//         encryptedFilepathDir,
//         "-node"
//       ]);
//       console.log("Java stdout: " + stdout.toString());
//     } catch (e) {
//       console.error("Java error param: " + e);
//     }
//     resolve();
//   });
// }
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function runJavaEncrypt(activeJar: string, filepath: string, encryptedFilepathDir: string) {
  const cmdArgs = [
    '-jar',
    activeJar,
    '-d',
    filepath.replaceAll('\\', '/'),
    '-enc',
    encryptedFilepathDir.replaceAll('\\', '/'),
    '-node'
  ];

  console.log('Calling Java encrypt.jar: ', cmdArgs.join(' '));

  try {
    const { stdout, stderr } = await execFileAsync('java', cmdArgs);
    if (stderr) {
      console.error('Java stderr: ' + stderr);
    }
    console.log('Java stdout: ' + stdout);
  } catch (error) {
    console.error('Java error: ' + error);
  }
}
