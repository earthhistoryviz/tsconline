import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import process from "process";
import { exec } from 'child_process';
import { readFile, writeFile, stat } from 'fs/promises';
import md5 from 'md5';
import { mkdirp } from 'mkdirp';
import { assertChartRequest } from '@tsconline/shared';
import { loadPresets } from './preset.js';
import { assertAssetConfig } from './types.js';
import { getDatapackInfo } from './parse.js';
import { deleteDirectory, checkIfPdfIsReady } from './util.js';
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
// this try will run the decryption jar to decrypt all files in the datapack folder
// TOOO: if the datapack is not encrypted, handle it properly. potentially a problem for the decrypt.jar
try {
    const datapacks = assetconfigs.activeDatapacks.map(datapack => assetconfigs.datapacksDirectory + "/" + datapack);
    const cmd = `java -jar ${assetconfigs.decryptionJar} `
        // Decrypting these datapacks:
        + `-d ${datapacks.join(" ")} `
        // Tell it where to send the datapacks
        + `-dest ${assetconfigs.decryptionDirectory} `;
    console.log('Calling Java decrypt.jar: ', cmd);
    exec(cmd, function (error, stdout, stderror) {
        console.log('Decryption finished');
        console.log("Decryption error param: " + error);
        console.log("Decryption stdout: " + stdout.toString());
        console.log("Decryption stderr: " + stderror.toString());
    });
}
catch (e) {
    console.log('ERROR: Failed to decrypt activeDatapacks in AssetConfig with error: ', e);
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
server.post('/removecache', async (request, reply) => {
    deleteDirectory(assetconfigs.chartsDirectory);
    reply.send({ message: "successfully removed cache" });
});
// Handle browser request for charts list:
// TODO: make this a websocket so we can try to report progress
// Note the "_" on the front of "request" tells TS that we aren't going to use it
server.get('/presets', async (_request, reply) => {
    reply.send(chartconfigs);
});
// Handles getting the columns for the files specified in the url
// Currently Returns ColumnSettings and Stages if they exist
// TODO: ADD ASSERTS
server.get('/datapackinfo/:files', async (request, reply) => {
    const { files } = request.params;
    console.log("getting decrypted info for files: ", files);
    const repl = await getDatapackInfo(assetconfigs.decryptionDirectory, files.split(" "));
    reply.send(repl);
});
// checks chart.pdf-status
// TODO: ADD ASSERTS
server.get('/pdfstatus/:hash', async (request, reply) => {
    const { hash } = request.params;
    const isPdfReady = await checkIfPdfIsReady(hash, assetconfigs.chartsDirectory);
    reply.send({ ready: isPdfReady });
});
// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.post('/charts/:usecache', async (request, reply) => {
    //TODO change this to be in request body
    const usecache = request.params.usecache === 'true';
    let chartrequest;
    try {
        chartrequest = JSON.parse(request.body);
        assertChartRequest(chartrequest);
    }
    catch (e) {
        console.log('ERROR: chart request is not valid.  Request was: ', chartrequest, '.  Error was: ', e);
        reply.send({ error: 'ERROR: chart request is not valid.  Error was: ' + e.toString() });
        return;
    }
    // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
    const hash = md5(chartrequest.settings + chartrequest.datapacks.join(','));
    const chartdir_urlpath = `/${assetconfigs.chartsDirectory}/${hash}`;
    const chart_urlpath = chartdir_urlpath + '/chart.pdf';
    const chartdir_filepath = chartdir_urlpath.slice(1); // no leading slash
    const chart_filepath = chart_urlpath.slice(1);
    const settings_filepath = chartdir_filepath + '/settings.tsc';
    // If this setting already has a chart, just return that
    try {
        await stat(chart_filepath);
        if (!usecache) {
            console.log("Deleting chart filepath since it already exists and cache is not being used");
            deleteDirectory(chart_filepath);
        }
        else {
            console.log('Request for chart that already exists (hash:', hash, '.  Returning cached version');
            reply.send({ chartpath: chart_urlpath, hash: hash }); // send the browser back the URL equivalent...
            return;
        }
    }
    catch (e) {
        // Doesn't exist, so make one
        console.log('Request for chart', chart_urlpath, ': chart does not exist, creating...');
    }
    // Create the directory and save the settings there for java:
    try {
        await mkdirp(chartdir_filepath);
        await writeFile(settings_filepath, chartrequest.settings);
        console.log('Successfully created and saved chart settings at', settings_filepath);
    }
    catch (e) {
        console.log('ERROR: failed to save settings at', settings_filepath, '  Error was:', e);
        reply.send({ error: 'ERROR: failed to save settings' });
        return;
    }
    const datapacks = chartrequest.datapacks.map(datapack => assetconfigs.datapacksDirectory + "/" + datapack);
    for (const datapack of chartrequest.datapacks) {
        if (!assetconfigs.activeDatapacks.includes(datapack)) {
            console.log('ERROR: datapack: ', datapack, ' is not included in activeDatapacks');
            console.log('assetconfig.activeDatapacks:', assetconfigs.activeDatapacks);
            console.log('chartrequest.datapacks: ', chartrequest.datapacks);
            reply.send({ error: 'ERROR: failed to load datapacks' });
            return;
        }
    }
    // Call the Java monster...
    //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
    //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
    const cmd = `java -Xmx512m -XX:MaxDirectMemorySize=64m -XX:MaxRAM=1g -jar ${assetconfigs.activeJar} -node `
        // Add settings:
        + `-s ${settings_filepath} -ss ${settings_filepath} `
        // Add datapacks:
        + `-d ${datapacks.join(" ")} `
        // Tell it where to save chart
        + `-o ${chart_filepath} `;
    // Exec Java command and send final reply to browser
    await new Promise((resolve, _reject) => {
        console.log('Calling Java: ', cmd);
        exec(cmd, function (error, stdout, stderror) {
            console.log('Java finished, sending reply to browser');
            console.log("Java error param: " + error);
            console.log("Java stdout: " + stdout.toString());
            console.log("Java stderr: " + stderror.toString());
            resolve();
        });
    });
    console.log('Sending reply to browser: ', { chartpath: chart_urlpath, hash: hash });
    reply.send({ chartpath: chart_urlpath, hash: hash });
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