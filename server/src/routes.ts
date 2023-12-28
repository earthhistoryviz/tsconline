
import { parse } from './parse.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import assetconfigs from './index.js';
import PDFParser from 'pdf2json';
import fs from 'fs';
import path from 'path';
// Handles getting the columns for the files specified in the url
// Currently Returns ColumnSettings and Stages if they exist
// TODO: ADD ASSERTS
export const fetchDatapackInfo = async function fetchDatapackInfo(request: FastifyRequest<{Params: { files: string}}>, reply: FastifyReply) {
  const { files } = request.params;
  console.log("getting decrypted info for files: ", files);
  const repl =  await parse(assetconfigs.decryptionDirectory, files.split(" "));
  reply.send(repl)
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