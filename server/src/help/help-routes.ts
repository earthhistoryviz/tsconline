import { FastifyReply, FastifyRequest } from "fastify";
import { processMarkdownTree } from "./process-markdown-tree.js";

export const fetchMarkdownFiles = async function fetchMarkdownFiles(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const tree = await processMarkdownTree();
    return reply.status(200).send(tree);
  } catch (e) {
    return reply.status(500).send({ error: "Failed to fetch markdown files" });
  }
};
