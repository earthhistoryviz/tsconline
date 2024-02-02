import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import process from "process";
import { exec } from 'child_process';
import { readFile, writeFile, stat } from 'fs/promises';
import md5 from 'md5';
import { mkdirp } from 'mkdirp';
import XLSX from 'xlsx';
import fs from 'fs';

import { assertChartRequest } from '@tsconline/shared';
import { loadPresets } from './preset.js';
import { AssetConfig, assertAssetConfig } from './types.js';
//import  { decrypt, readAndDecryptFile } from './decrypt.js';

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

function readExcelFile(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName: string = workbook.SheetNames[0] || ""; // Assuming the data is in the first sheet
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  // Convert sheet to JSON
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Log the converted JSON data to the console
  // console.log(jsonData);
/*
  const columnData: string[] = jsonData
    .filter((row: string[]) => row.length >= 3) // Filter rows with at least 3 columns
    .map((row: string[]) => (row[2] || "")); // Extract data from the third column

  const uniqueValues: string[] = Array.from(new Set(columnData)); // Get unique values
  return uniqueValues;
*/
  return jsonData;
}


// Load up all the chart configs found in presets:
const chartconfigs = await loadPresets();
// Load the current asset config:
let assetconfigs: AssetConfig;
try {
  const contents = JSON.parse((await readFile('assets/config.json')).toString());
  assertAssetConfig(contents);
  assetconfigs = contents;
} catch(e: any) {
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
  methods: ["GET", "POST" ],
});

// Handle browser request for charts list:
// TODO: make this a websocket so we can try to report progress
// Note the "_" on the front of "request" tells TS that we aren't going to use it
server.get('/presets', async (_request, reply) => {
  reply.send(chartconfigs);
})

type Timescale = {
  // Define the structure of Timescale type here
  key: string;
  value: number;
  // Add other properties based on your actual Timescale structure
};

function assertTimescale(val: any): asserts val is Timescale {
  if (!val || typeof val !== 'object') {
    console.error('Received invalid object:', val);
    throw new Error('Must be an object');
  }

  // Additional checks for required keys, types, etc.
  if (typeof val.key !== 'string' || typeof val.value !== 'number') {
    console.error('Invalid Timescale object:', val);
    throw new Error('Invalid Timescale object');
  }
}

// Serve timescale data endpoint
server.get('/timescale', async (_req, res) => {
  try {
    const filePath = '../default_timescale.xlsx';

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error('Error: Excel file not found');
      res.status(404).send({ error: 'Excel file not found' });
      return;
    }

    let timescaleData: any[] = readExcelFile(filePath);
    timescaleData = timescaleData.map(([period, series, stage, ma, color]) => ({
      key: stage || '',
      value: parseFloat(ma) || 0,
    }));
    timescaleData = timescaleData.filter(item => item.key && item.key !== 'Stage' && item.key !== 'TOP');
    timescaleData.forEach((data) => assertTimescale(data));
    console.log(timescaleData);
    res.send({ stages: timescaleData });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

server.post('/charts', async (request, reply) => {
  // const key = Buffer.from('016481d57e032c18f750919bcd7dba2e', 'hex');
  // const iv = Buffer.from('2e918edf00c37c9c722512e35cf498a4', 'hex');
  // console.log('key: ', key);
  // console.log('iv: ', iv);
  // readAndDecryptFile('assets/datapacks/TimeTree of Life GTS2020.dpk', key, iv);

  let chartrequest;
  try {
    chartrequest = JSON.parse(request.body as string);
    assertChartRequest(chartrequest);
  } catch (e: any) {
    console.log('ERROR: chart request is not valid.  Request was: ', chartrequest, '.  Error was: ', e);
    reply.send({ error: 'ERROR: chart request is not valid.  Error was: '+e.toString() });
    return;
  }

  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(chartrequest.settings + chartrequest.datapacks.join(','));
  const chartdir_urlpath = '/public/charts/'+hash;
  const chart_urlpath = chartdir_urlpath+ '/chart.pdf';

  const chartdir_filepath = chartdir_urlpath.slice(1); // no leading slash
  const chart_filepath = chart_urlpath.slice(1);
  const settings_filepath = chartdir_filepath + '/settings.tsc';

  // If this setting already has a chart, just return that
  try {
    await stat(chart_filepath);
    console.log('Request for chart that already exists (hash:',hash,'.  Returning cached version');
    reply.send({ chartpath: chart_urlpath }); // send the browser back the URL equivalent...
    return;
  } catch(e: any) { 
    // Doesn't exist, so make one
    console.log('Request for chart', chart_urlpath, ': chart does not exist, creating...');
  }

  // Create the directory and save the settings there for java:
  try {
    await mkdirp(chartdir_filepath);
    await writeFile(settings_filepath, chartrequest.settings);
    console.log('Successfully created and saved chart settings at',settings_filepath);
  } catch(e: any) {
    console.log('ERROR: failed to save settings at',settings_filepath,'  Error was:', e);
    reply.send({ error: 'ERROR: failed to save settings' });
    return;
  }
  for (const datapack of chartrequest.datapacks) {
    if (!assetconfigs.activeDatapacks.includes(datapack)) {
      console.log('ERROR: datapack: ',datapack,' is not included in activeDatapacks')
      console.log('assetconfig.activeDatapacks:', assetconfigs.activeDatapacks)
      console.log('chartrequest.datapacks: ', chartrequest.datapacks)
      reply.send({ error: 'ERROR: failed to load datapacks' });
      return;
    }
  }


  // Call the Java monster...
  //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
  //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
  const cmd = `java -Xmx2048m -jar ${assetconfigs.activeJar} -node `
    // Add settings:
    + `-s ${settings_filepath} -ss ${settings_filepath} ` 
    // Add datapacks:
    + `-d ${chartrequest.datapacks} `
    // Tell it where to save chart
    + `-o ${chart_filepath} `;

  
  // Exec Java command and send final reply to browser
  await new Promise<void>((resolve, _reject) => {
    console.log('Calling Java: ', cmd);
    exec(cmd, function (error, stdout, stderror) {
      console.log('Java finished, sending reply to browser');
      console.log("Java error param: " + error);
      console.log("Java stdout: " + stdout.toString());
      console.log("Java stderr: " + stderror.toString());
      console.log('Sending reply to browser: ', { chartpath: chart_urlpath });
      reply.send({ chartpath: chart_urlpath });
      resolve();
    });
  });

});

// Start the server...
try {
  await server.listen({ 
    host: '0.0.0.0', // for this to work in Docker, you need 0.0.0.0
    port: +(process.env.port || 3000), 
  })
  const address = server.server.address()
  console.log('Server listening on ',address);
} catch (err) {
  console.log("Server error: " + err);
  server.log.error(err)
  process.exit(1)
}

// //Endpoint to serve the timescale data
// app.get('/timescale', (req: Request, res: Response) => {
//   const timescaleData = readExcelFile('path.xlsx'); // what is path.xlsx from the GitHub repo?
//   res.json({ stages: timescaleData });
// });
