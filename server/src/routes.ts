
import { parse } from './parse.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import { writeFile, stat } from 'fs/promises';
import { assertChartRequest } from '@tsconline/shared';
import { deleteDirectory } from './util.js' 
import { mkdirp } from 'mkdirp';
import { grabMapImages } from './mappacks.js'
import md5 from 'md5';
import assetconfigs from './index.js';
import PDFParser from 'pdf2json';
import fs from 'fs';
import path from 'path';
// Handles getting the columns for the files specified in the url
// Currently Returns ColumnSettings and Stages if they exist
// TODO: ADD ASSERTS
export const fetchDatapackInfo = async function fetchDatapackInfo(request: FastifyRequest<{Params: { files: string}}>, reply: FastifyReply) {
  deleteDirectory(assetconfigs.imagesDirectory)
  const { files } = request.params;
  console.log("getting decrypted info for files: ", files);
  const filesSplit = files.split(" ")
  const { columns, stages } =  await parse(assetconfigs.decryptionDirectory, filesSplit);
  const images = await grabMapImages(filesSplit, assetconfigs.imagesDirectory);
  console.log(images)
  reply.send({ columns: columns, stages: stages, image_paths: images})
}

/**
 * Will attempt to read pdf and return whether it can or not
 * Runs with await
 * TODO: ADD ASSERTS
 */
export const fetchPdfStatus = async function fetchPdfStatus(request: FastifyRequest<{ Params: { hash: string } }>, reply: FastifyReply) {
  const { hash } = request.params;
  const isPdfReady = await new Promise((resolve, reject) => {
        const filepath = `${assetconfigs.chartsDirectory}/${hash}/chart.pdf`;
        if (!fs.existsSync(filepath)) {
            return resolve(false);
        }

        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', (errData: any) => {
            console.error('PDF Parser Error:', errData.parserError);
            resolve(false);
        });

        pdfParser.on('pdfParser_dataReady', _pdfData => {
            console.log("Successfully read chart.pdf");
            resolve(true);
        });

        pdfParser.loadPDF(filepath);
    });
  reply.send({ ready: isPdfReady });
}

/**
 * Will fetch a chart with or without the cache
 * Will return the chart path and the hash the chart was saved with
 */
export const fetchChart = async function fetchChart(request: FastifyRequest<{Params: { usecache: string }}>, reply: FastifyReply) {
    //TODO change this to be in request body
    const usecache = request.params.usecache === 'true'
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
    const chartdir_urlpath = `/${assetconfigs.chartsDirectory}/${hash}`;
    const chart_urlpath = chartdir_urlpath+ '/chart.pdf';

    const chartdir_filepath = chartdir_urlpath.slice(1); // no leading slash
    const chart_filepath = chart_urlpath.slice(1);
    const settings_filepath = chartdir_filepath + '/settings.tsc';

    // If this setting already has a chart, just return that
    try {
    await stat(chart_filepath);
    if (!usecache) {
        console.log("Deleting chart filepath since it already exists and cache is not being used")
        deleteDirectory(chart_filepath)
    } else {
        console.log('Request for chart that already exists (hash:',hash,'.  Returning cached version');
        reply.send({ chartpath: chart_urlpath, hash: hash}); // send the browser back the URL equivalent...
        return;
    }
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
    const datapacks = chartrequest.datapacks.map(datapack => assetconfigs.datapacksDirectory + "/" + datapack)
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
    const cmd = `java -Xmx512m -XX:MaxDirectMemorySize=64m -XX:MaxRAM=1g -jar ${assetconfigs.activeJar} -node `
    // Add settings:
    + `-s ${settings_filepath} -ss ${settings_filepath} ` 
    // Add datapacks:
    + `-d ${datapacks.join(" ")} `
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
            resolve();
        });
    });
    console.log('Sending reply to browser: ', { chartpath: chart_urlpath, hash: hash });
    reply.send({ chartpath: chart_urlpath, hash: hash });
}