
import * as crypto from 'crypto';
import { writeFile } from 'fs/promises';
import * as fs from 'fs';
function decrypt(file: Buffer, key: Buffer, iv: Buffer): Buffer {
  console.log(file);
  const algorithm = 'aes-128-cfb';
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = Buffer.concat([decipher.update(file), decipher.final()]);
  console.log(decrypted.toString('utf-8'));
  return decrypted
}
export default async function readAndDecryptFile(filePath: string, key: Buffer, iv: Buffer): Promise<void> {
  let fileStream = fs.createReadStream(filePath, {
    encoding: 'utf-8'
  });
  console.log(fileStream);
  let headers: string = "";
  let encryptedChunks: Buffer[] = [];
  let headerLinesToSkip = 2;
  let readStreamBuffer = Buffer.alloc(0); 

    // Read the remaining encrypted data
  fileStream.on('data', (chunk: Buffer) => {
    console.log(chunk);
    readStreamBuffer = Buffer.concat([readStreamBuffer, chunk]);
    if (headerLinesToSkip > 0) {
      while (headerLinesToSkip > 0) {
        const indexOfNewline = readStreamBuffer.indexOf('\n');
        // If we find a newline, we skip the header line.
        if (indexOfNewline !== -1) {
          // Extract the header line if needed for later.
          const headerLine = readStreamBuffer.slice(0, indexOfNewline).toString();
          console.log('Header Line:', headerLine); // Logging or processing the header line.
          
          // Remove the header line from the buffer.
          readStreamBuffer = readStreamBuffer.slice(indexOfNewline + 1);
          headerLinesToSkip -= 1;
        } else {
          // If no newline found, we wait for more data.
          break;
        }
      }
    }
  });

  fileStream.on('end', async () => {
    // All data has been read, now decrypt it
    const decryptedData = decrypt(readStreamBuffer, key, iv);
    await writeFile('assets/decrypt', decryptedData.toString('utf-8'));
    // Do something with the decrypted data, such as writing it to a file
  });

  console.log(readStreamBuffer);
  console.log('Headers:', headers);
}