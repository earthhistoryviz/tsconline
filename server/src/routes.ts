
import { parse } from './parse.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import assetconfigs from './index.js';
// Handles getting the columns for the files specified in the url
// Currently Returns ColumnSettings and Stages if they exist
// TODO: ADD ASSERTS
export const fetchDatapackInfo = async function fetchDatapackInfo(request: FastifyRequest<{Params: { files: string}}>, reply: FastifyReply) {
  const { files } = request.params;
  console.log("getting decrypted info for files: ", files);
  const repl =  await parse(assetconfigs.decryptionDirectory, files.split(" "));
  reply.send(repl)
}