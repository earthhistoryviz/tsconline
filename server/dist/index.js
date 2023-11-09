import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import process from "process";
import 'child_process';
import { readFile, writeFile } from 'fs/promises';
import 'md5';
import 'mkdirp';
import '@tsconline/shared';
import { loadPresets } from './preset.js';
import { assertAssetConfig } from './types.js';
import * as crypto from 'crypto';
import fs from 'fs';
import 'readline';
const server = fastify({
    logger: false,
    bodyLimit: 1024 * 1024 * 100, // 10 mb
    /*{  // uncomment for detailed logs from fastify
     transport: {
       target: 'pino-pretty',
       options: {
         translateTime: 'HH:MM:ss Z',
         ignore: 'pid,hostname',
       },
     }
   }*/
});
// Load up all the chart configs found in presets:
const chartconfigs = await loadPresets();
// Load the current asset config:
let assetconfigs;
try {
    const contents = JSON.parse((await readFile('assets/config.json')).toString());
    assertAssetConfig(contents);
    assetconfigs = contents;
}
catch (e) {
    console.log('ERROR: Failed to load asset configs from assets/config.json.  Error was: ', e);
    process.exit(1);
}
// Serve the main app from /
// @ts-ignore
server.register(fastifyStatic, {
    root: process.cwd() + '/../app/dist',
    prefix: '/',
});
// Serve the generated charts, etc. from server/public/
// @ts-ignore
server.register(fastifyStatic, {
    root: process.cwd() + '/public',
    prefix: '/public/',
    decorateReply: false // first registration above already added the decorator
});
// Helpful for testing locally:
// @ts-ignore
server.register(cors, {
    origin: "*",
    methods: ["GET", "POST"],
});
// Handle browser request for charts list:
// TODO: make this a websocket so we can try to report progress
// Note the "_" on the front of "request" tells TS that we aren't going to use it
server.get('/presets', async (_request, reply) => {
    reply.send(chartconfigs);
});
function decrypt(file, key, iv) {
    console.log(file);
    const algorithm = 'aes-128-cfb';
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = Buffer.concat([decipher.update(file), decipher.final()]);
    console.log(decrypted.toString('utf-8'));
    return decrypted;
}
async function readAndDecryptFile(filePath, key, iv) {
    let fileStream = fs.createReadStream(filePath, {
        encoding: 'utf-8'
    });
    console.log(fileStream);
    let headers = "";
    let encryptedChunks = [];
    let headerLinesToSkip = 2;
    let readStreamBuffer = Buffer.alloc(0);
    // Read the remaining encrypted data
    fileStream.on('data', (chunk) => {
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
                }
                else {
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
server.post('/charts', async (request, reply) => {
    const key = Buffer.from('016481d57e032c18f750919bcd7dba2e', 'hex');
    const iv = Buffer.from('2e918edf00c37c9c722512e35cf498a4', 'hex');
    console.log('key: ', key);
    console.log('iv: ', iv);
    readAndDecryptFile('assets/datapacks/TimeTree of Life GTS2020.dpk', key, iv);
    console.log('what');
    // const key = Buffer.from('AWSB1X4DLBj3UJGbzX26Lg==', 'base64');
    // const iv = Buffer.from('LpGO3wDDfJxyJRLjXPSYpA==', 'base64');
    // const key = '016481d57e032c18f750919bcd7dba2e';
    // const iv = '2e918edf00c37c9c722512e35cf498a4';
    // let decrypted = decipher.update(file, 'hex', 'utf8');
    // const decrypt = AES.decrypt((await readFile('assets/datapacks/TimeTree of Life GTS2020.dpk')).toString(), SHA256('1100-127-4312634424-980-111-101-51125-7046'));
    // console.log(JSON.stringify(decrypt));
    // console.log('decrypt', decrypt.toString(enc.Utf8));
    // let chartrequest;
    // try {
    //   chartrequest = JSON.parse(request.body as string);
    //   assertChartRequest(chartrequest);
    // } catch (e: any) {
    //   console.log('ERROR: chart request is not valid.  Request was: ', chartrequest, '.  Error was: ', e);
    //   reply.send({ error: 'ERROR: chart request is not valid.  Error was: '+e.toString() });
    //   return;
    // }
    // // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
    // const hash = md5(chartrequest.settings + chartrequest.datapacks.join(','));
    // const chartdir_urlpath = '/public/charts/'+hash;
    // const chart_urlpath = chartdir_urlpath+ '/chart.pdf';
    // const chartdir_filepath = chartdir_urlpath.slice(1); // no leading slash
    // const chart_filepath = chart_urlpath.slice(1);
    // const settings_filepath = chartdir_filepath + '/settings.tsc';
    // // If this setting already has a chart, just return that
    // try {
    //   await stat(chart_filepath);
    //   console.log('Request for chart that already exists (hash:',hash,'.  Returning cached version');
    //   reply.send({ chartpath: chart_urlpath }); // send the browser back the URL equivalent...
    //   return;
    // } catch(e: any) { 
    //   // Doesn't exist, so make one
    //   console.log('Request for chart', chart_urlpath, ': chart does not exist, creating...');
    // }
    // // Create the directory and save the settings there for java:
    // try {
    //   await mkdirp(chartdir_filepath);
    //   await writeFile(settings_filepath, chartrequest.settings);
    //   console.log('Successfully created and saved chart settings at',settings_filepath);
    // } catch(e: any) {
    //   console.log('ERROR: failed to save settings at',settings_filepath,'  Error was:', e);
    //   reply.send({ error: 'ERROR: failed to save settings' });
    //   return;
    // }
    // for (const datapack of chartrequest.datapacks) {
    //   if (!assetconfigs.activeDatapacks.includes(datapack)) {
    //     console.log('ERROR: datapack: ',datapack,' is not included in activeDatapacks')
    //     console.log('assetconfig.activeDatapacks:', assetconfigs.activeDatapacks)
    //     console.log('chartrequest.datapacks: ', chartrequest.datapacks)
    //     reply.send({ error: 'ERROR: failed to load datapacks' });
    //     return;
    //   }
    // }
    // // Call the Java monster...
    // //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
    // //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
    // const cmd = `java -Xmx2048m -jar ${assetconfigs.activeJar} -node `
    //   // Add settings:
    //   + `-s ${settings_filepath} -ss ${settings_filepath} ` 
    //   // Add datapacks:
    //   + `-d ${chartrequest.datapacks} `
    //   // Tell it where to save chart
    //   + `-o ${chart_filepath} `;
    // // Exec Java command and send final reply to browser
    // await new Promise<void>((resolve, _reject) => {
    //   console.log('Calling Java: ', cmd);
    //   exec(cmd, function (error, stdout, stderror) {
    //     console.log('Java finished, sending reply to browser');
    //     console.log("Java error param: " + error);
    //     console.log("Java stdout: " + stdout.toString());
    //     console.log("Java stderr: " + stderror.toString());
    //     console.log('Sending reply to browser: ', { chartpath: chart_urlpath });
    //     reply.send({ chartpath: chart_urlpath });
    //     resolve();
    //   });
    // });
});
// Start the server...
try {
    await server.listen({
        host: '0.0.0.0',
        port: +(process.env.port || 3000),
    });
    const address = server.server.address();
    console.log('Server listening on ', address);
}
catch (err) {
    console.log("Server error: " + err);
    server.log.error(err);
    process.exit(1);
}
//# sourceMappingURL=index.js.map