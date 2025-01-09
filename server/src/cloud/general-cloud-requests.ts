import { Multipart } from "@fastify/multipart";
import { rm } from "fs/promises";
import { OperationResult, isOperationResult } from "../types";
import {
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest,
    processEditDatapackRequest
} from "../user/user-handler";
import { editDatapack } from "./edit-handler";

export const editDatapackMetadataRequestHandler = async function editDatapackMetadataRequestHandler(
    parts: AsyncIterableIterator<Multipart>,
    uuid: string,
    datapack: string
): Promise<OperationResult> {
    const response = await processEditDatapackRequest(parts, uuid).catch(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    });
    if (!response) {
        return { code: 500, message: "Failed to process request" };
    }
    if (isOperationResult(response)) {
        return response;
    }
    try {
        const partial = convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(response.fields);
        const errors = await editDatapack(uuid, datapack, partial);
        if (errors.length > 0) {
            return { code: 422, message: "There were errors updating the datapack" };
        }
    } catch (e) {
        return { code: 500, message: "Failed to edit metadata" };
    } finally {
        // remove temp files; files should be removed normally, but if there is an error, we should remove them here
        for (const file of response.tempFiles) {
            await rm(file, { force: true }).catch(() => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            });
        }
    }
    return { code: 200, message: `Successfully edited metadata for ${datapack}` };
};
