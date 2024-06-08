
import { FastifyRequest, FastifyReply } from 'fastify';
import {
    checkHeader
} from "../src/util";
import {
    requestDownload
} from "../src/routes";
import { runJavaEncrypt } from "../src/encryption";
import { createMock } from 'ts-auto-mock';

const { access: realAccess } = jest.requireActual('fs/promises');
const { readFile: realReadFile } = jest.requireActual('fs/promises');
//const { runJavaEncrypt: realJavaEncrypt } = jest.requireActual('./encryption.js');
/* import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
    ...utilModule,
    grabFilepaths: jest.fn().mockImplementation((_files, decrypt_filepath) => {
        return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
    }),
})); */
/* jest.mock('child_process', () => ({
    __esModule: true,
    exec: jest.fn(),
})); */
jest.mock('./encryption.js', () => ({
    __esModule: true,
    exec: jest.requireActual('child_process'),
}));
jest.mock('./index.js', () => ({
    __esModule: true,
    assetconfigs: { activeJar: "server/assets/jars/TSCreatorBASE-8.1_24May2024.jar" },
    datapackIndex: {},
    mapPackIndex: {},
}));
jest.mock('svgson', () => ({
    __esModule: true,
    svgson: {}

}));
jest.mock('./file-metadata-handler.js', () => ({
    updateFileMetadata: jest.fn(),
    writeFileMetadata: jest.fn()
}));
jest.mock('./load-packs.js', () => ({
    loadIndexes: jest.fn()
}));

jest.mock('path', () => ({
    path: jest.fn()
}));;
jest.mock('md5', () => ({
    md5: jest.fn()
}));
jest.mock('pump', () => ({
    pump: jest.fn()
}));
jest.mock('./parse-excel-file.js', () => ({
    __esModule: true,
    parseExcelFile: jest.fn()

}));

/* jest.mock('./encryption.js', () => ({
    runEncryption: jest.fn()
})) */


jest.mock('./util.js', () => ({
    __esModule: true,
    deleteDirectory: jest.fn(),
    resetUploadDirectory: jest.fn(),
}));
jest.mock('@tsconline/shared', () => ({
    //for these five, check if I need to change them to the correct format
    DatapackIndex: {},
    DatapackInfoChunk: {},
    MapPackIndex: {},
    MapPackInfoChunk: {},
    TimescaleItem: {},
    assertChartRequest: jest.fn().mockReturnValue(true),
    assertDatapackIndex: jest.fn().mockReturnValue(true),
    assertIndexResponse: jest.fn().mockReturnValue(true),
    assertMapPackIndex: jest.fn().mockReturnValue(true),
    assertTimescale: jest.fn().mockReturnValue(true),
}));
// Mocking readline.createInterface
jest.mock('readline/promises', () => ({
    __esModule: true,
    createInterface: jest.fn().mockImplementationOnce(() => {
        const lines: string[] = ['TSCreator Encrypted Datafile'];
        return lines;
    })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['TSCreator Encrypted Datafile'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['TSCreator Encrypted Datafile'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['TSCreator Encrypted Datafile'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['not properly encrypted'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['TSCreator Encrypted Datafile'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['default content'];
            return lines;
        })
        .mockImplementationOnce(() => {
            const lines: string[] = ['not properly encrypted'];
            return lines;
        }),
}));
jest.mock('fs/promises', () => ({
    __esModule: true,
    access: jest.fn().mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error('File not found');
        error.code = 'ENOENT';
        throw error;
    })
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockImplementationOnce(() => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            throw error;
        })
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementation(() => Promise.resolve())
        .mockImplementationOnce(() => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            throw error;
        })
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => {
            throw new Error('Unknown error');
        })
        .mockImplementationOnce(() => {
            throw new Error('Unknown error');
        })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            throw error;
        })
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            throw error;
        })
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            throw error;
        })
        .mockImplementationOnce(() => Promise.resolve()),


    readFile: jest.fn().mockResolvedValueOnce(Buffer.from('default content'))
        .mockResolvedValueOnce(Buffer.from('TSCreator Encrypted Datafile'))
        .mockImplementationOnce(() =>
            Promise.resolve(Buffer.from('default content'))
        )
        .mockImplementationOnce(() => Promise.resolve('TSCreator Encrypted Datafile'))
        .mockImplementation(() => Promise.resolve(Buffer.from('TSCreator Encrypted Datafile')))
        .mockImplementation(() => Promise.resolve('TSCreator Encrypted Datafile'))
        .mockImplementation(() => {
            throw new Error('Unknown error');
        })
        .mockImplementation(() => {
            throw new Error('Unknown error');
        })
        .mockImplementationOnce(() => Promise.resolve('not properly encrypted'))
        .mockImplementationOnce(() => Promise.resolve('default content'))
        .mockImplementationOnce(() => Promise.resolve('TSCreator Encrypted Datafile'))
        .mockImplementationOnce(() => Promise.resolve('default content'))
        .mockImplementationOnce(() => Promise.resolve('default content'))
        .mockImplementationOnce(() => Promise.resolve('default content'))
        .mockImplementationOnce(() => Promise.resolve('not properly encrypted')),



    rm: jest.fn().mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
    fsPromises: jest.fn()
}));
jest.mock('fs', () => ({
    __esModule: true,
    fs: jest.fn(),
    createReadStream: jest.fn(),
    constants: jest.fn()
}));

jest.mock('mkdirp', () => ({
    __esModule: true,
    mkdirp: jest.fn().mockImplementationOnce(() => {
        throw new Error('Unknown error');
    }),
}));

//jest.spyOn(console, 'log').mockImplementation(() => { });;
//jest.spyOn(console, 'error').mockImplementation(() => { });;

jest.mock('glob', () => ({
    __esModule: true,
    glob: jest.fn(),
}));



// Tests for checkHeader
describe("checkHeader", () => {

    test('checkHeader("encrypted.txt") returns true', async () => {
        expect(await checkHeader("encrypted.txt")).toEqual(
            true);
    });
    test('checkHeader("unencrypted.txt") returns false', async () => {
        expect(await checkHeader("unencrypted.txt")).toEqual(
            false);
    });
});

async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await realAccess(filePath);
        return true;
    } catch (error) {
        return false;
    }
}
// Tests for runJavaEncrypt 
describe('runJavaEncrypt', () => {

    /* (access as jest.Mock).mockImplementation(realAccess);
    (readFile as jest.Mock).mockImplementation(realReadFile); */
    it('should correctly encrypt an unencrypted TSCreator txt file', async () => {
        if (!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-1.txt")) {
            await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-1.txt", "server/_test_/_data_/encryption-test-generated-file")
            console.log("should be finished");
        }
        const resultFilePath = 'server/_test_/_data_/encryption-test-generated-file/encryption-test-1.txt';
        const keyFilePath = 'server/_test_/_data_/encryption-test-keys/test-1-key.txt';
        const [result, key] = await Promise.all([
            realReadFile(resultFilePath),
            realReadFile(keyFilePath)
        ]);
        expect(result).toEqual(key);
        // Compare the byte size (length)
        expect(result.length).toBe(key.length);
    });
    it('should correctly encrypt an encrypted TSCreator txt file, when the TSCreator Encrypted Datafile title is manually removed from the original encrypted file.', async () => {
        if (!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-2.txt")) {
            await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-2.txt", "server/_test_/_data_/encryption-test-generated-file")
        }
        const resultFilePath = 'server/_test_/_data_/encryption-test-generated-file/encryption-test-2.txt';
        const keyFilePath = 'server/_test_/_data_/encryption-test-keys/test-2-key.txt';
        const [result, key] = await Promise.all([
            realReadFile(resultFilePath),
            realReadFile(keyFilePath)
        ]);
        expect(result).toEqual(key);
        // Compare the byte size (length)
        expect(result.length).toBe(key.length);
    });
    it('should correctly encrypt an unencrypted TSCreator zip file', async () => {
        if (!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-5.txt")) {
            await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-5.txt", "server/_test_/_data_/encryption-test-generated-file")
        }
        const resultFilePath = 'server/_test_/_data_/encryption-test-generated-file/encryption-test-5.txt';
        const keyFilePath = 'server/_test_/_data_/encryption-test-keys/test-5-key.txt';
        const [result, key] = await Promise.all([
            realReadFile(resultFilePath),
            realReadFile(keyFilePath)
        ]);
        expect(result).toEqual(key);
        // Compare the byte size (length)
        expect(result.length).toBe(key.length);
    });
    it('should correctly encrypt an encrypted TSCreator zip file', async () => {
        if (!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-6.txt")) {
            await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-6.txt", "server/_test_/_data_/encryption-test-generated-file")
        }
        const resultFilePath = 'server/_test_/_data_/encryption-test-generated-file/encryption-test-6.txt';
        const keyFilePath = 'server/_test_/_data_/encryption-test-keys/test-6-key.txt';
        const [result, key] = await Promise.all([
            realReadFile(resultFilePath),
            realReadFile(keyFilePath)
        ]);
        expect(result).toEqual(key);
        // Compare the byte size (length)
        expect(result.length).toBe(key.length);
    });
    it('should not encrypt a bad txt file', async () => {
        await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-3.txt", "server/_test_/_data_/encryption-test-generated-file");
        expect(!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-3.txt"));

    });
    it('should not encrypt an encrypted TSCreator txt file with the TSCreator Encrypted Datafile title', async () => {
        await runJavaEncrypt("server/assets/jars/TSCreatorBASE-8.1_24May2024.jar", "server/_test_/_data_/encryption-test-4.txt", "server/_test_/_data_/encryption-test-generated-file");
        expect(!await checkFileExists("server/_test_/_data_/encryption-test-generated-file/encryption-test-4.txt"));
    });
});


// Tests for route. runJaveEncrypt is mocked
jest.mock('./routes.js', () => ({
    runJavaEncrypt: jest.fn()
        .mockImplementationOnce(() => {
            return Promise.resolve();
        })
        .mockImplementationOnce(() => {
            return Promise.resolve();
        })
        .mockImplementationOnce(() => {
            return Promise.reject(new Error('Unknown error'));
        })
        .mockImplementationOnce(() => {
            return Promise.reject(new Error('Unknown error'));
        }),
    //checkHeader: jest.fn(),
    path: jest.requireActual('path')
}));


// Create the mock

describe('requestDownload', () => {
    //const req = createMock<FastifyRequest>
    /*  jest.mock('./route.js', () => ({
         runJavaEncrypt: jest.fn(),
         checkHeader: jest.fn()
     })); */
    /*  const mockRequestEncryptedDownload = {
         session: {
             get: jest.fn(),
         },
         params: {
             filename: "testfile.txt",
         },
         query: {
             needEncryption: true,
         },
     } as unknown as FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>; */
    const mockRequestEncryptedDownload = createMock<FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>>();
    mockRequestEncryptedDownload.params.filename = 'testfile.txt';
    mockRequestEncryptedDownload.query.needEncryption = true;
    /* const mockRequestRetrieveOriginal = {
        session: {
            get: jest.fn(),
        },
        params: {
            filename: "testfile.txt",
        },
    } as unknown as FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>; */
    const mockRequestRetrieveOriginal = createMock<FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>>();
    mockRequestEncryptedDownload.params.filename = 'testfile.txt';

    /*  const mockReply = {
         status: jest.fn().mockReturnThis(),
         send: jest.fn(),
     } as unknown as FastifyReply; */
    const mockReply = createMock<FastifyReply>();
    const uuid = '12345-abcde';

    it('should reply 401 if uuid is not present when request any type of download', async () => {
        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(undefined);
        mockRequestRetrieveOriginal.session.get = jest.fn().mockReturnValue(undefined);
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /*  expect(runJavaEncrypt).not.toHaveBeenCalled();
         expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.status).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'User not logged in' });

        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        /*  expect(runJavaEncrypt).not.toHaveBeenCalled();
         expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.status).toHaveBeenCalledWith(401);
        expect(mockReply.send).toHaveBeenCalledWith({ error: 'User not logged in' });


    });

    it('should reply 404 if the file does not exist when request any type of download', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);
        mockRequestRetrieveOriginal.session.get = jest.fn().mockReturnValue(uuid);
        /*  (access as jest.Mock).mockImplementation(() => {
             const error: NodeJS.ErrnoException = new Error('File not found');
             error.code = 'ENOENT';
             throw error;
         }); */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /* expect(runJavaEncrypt).not.toHaveBeenCalled();
        expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.status).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: `The file requested testfile.txt does not exist within user's upload directory`,
        });
        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        /* expect(runJavaEncrypt).not.toHaveBeenCalled();
        expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.status).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: `The file requested testfile.txt does not exist within user's upload directory`,
        });

    });

    // TODO: finish all cases for requestDownload
    it('should return the original file when request retrieve original file', async () => {

        mockRequestRetrieveOriginal.session.get = jest.fn().mockReturnValue(uuid);
        /* (access as jest.Mock).mockResolvedValue(undefined); //there2 */
        // when the original file is unencrypted
        //(readFile as jest.Mock).mockResolvedValue(Buffer.from('default content'));//hey1
        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        /*  expect(runJavaEncrypt).not.toHaveBeenCalled();
         expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('default content')
        );
        // when the original file is encrypted
        // (readFile as jest.Mock).mockResolvedValue(Buffer.from('TSCreator Encrypted Datafile'));//hey 2
        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        /* expect(runJavaEncrypt).not.toHaveBeenCalled();
        expect(checkHeader).not.toHaveBeenCalled(); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('TSCreator Encrypted Datafile')
        );
    });

    it('should return a newly encrypted file when request encrypted download an unencrypted file which has not been encrypted before', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);


        /* (createReadStream as jest.Mock)
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('default content');
                stream.push(null); // End of stream
                return stream;
            })
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('TSCreator Encrypted Datafile');
                stream.push(null); // End of stream
                return stream;
            }); //here1 */
        /* (access as jest.Mock)
            .mockImplementationOnce(() => {
                const error: NodeJS.ErrnoException = new Error('File not found');
                error.code = 'ENOENT';
                throw error;
            })
            .mockImplementationOnce(() => Promise.resolve())
            .mockImplementationOnce(() => Promise.resolve());//there3 */

        /* (readFile as jest.Mock)
            .mockImplementationOnce(() =>
                Promise.resolve(Buffer.from('default content'))
            )
            .mockImplementationOnce(() => Promise.resolve('TSCreator Encrypted Datafile')); */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /* expect(runJavaEncrypt).toHaveBeenCalled();
        expect(checkHeader).toHaveBeenCalledTimes(2); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('TSCreator Encrypted Datafile')
        );
    });
    it('should return the old encrypted file when request encrypted download an unencrypted file which has been encrypted before', async () => {

        (mockRequestEncryptedDownload.session.get as jest.Mock).mockReturnValue(uuid);

        /*  (createReadStream as jest.Mock)
             .mockImplementation(() => {
                 const stream = new PassThrough();
                 stream.push('TSCreator Encrypted Datafile');
                 stream.push(null); // End of stream
                 return stream;
             });//here 2 */
        //(access as jest.Mock).mockImplementation(() => Promise.resolve());//THERE4

        /* (readFile as jest.Mock).mockImplementation(() => Promise.resolve(Buffer.from('TSCreator Encrypted Datafile'))
        );//hey4  */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /*  expect(runJavaEncrypt).not.toHaveBeenCalled();
         expect(checkHeader).toHaveBeenCalledTimes(1); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('TSCreator Encrypted Datafile')
        );
    });
    it('should return the original encrypted file when request encrypted download an encrypted file', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);

        /*  (createReadStream as jest.Mock).mockImplementation(() => {
             const stream = new PassThrough();
             stream.push('TSCreator Encrypted Datafile');
             stream.push(null); // End of stream
             return stream;
         });// here 3 */
        /* (access as jest.Mock)
            .mockImplementationOnce(() => {
                const error: NodeJS.ErrnoException = new Error('File not found');
                error.code = 'ENOENT';
                throw error;
            })
            .mockImplementationOnce(() => Promise.resolve());//THERE 5 */

        /* (readFile as jest.Mock)
            .mockImplementation(() => Promise.resolve('TSCreator Encrypted Datafile'));//hey 5 */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /* expect(runJavaEncrypt).not.toHaveBeenCalled();
        expect(checkHeader).toHaveBeenCalledTimes(1); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('TSCreator Encrypted Datafile')
        );
    });
    //case for any time during the process an unknown error occured (set access/readfile/rm to throw error). should reply with 500 and "An error occurred " + e

    it('should reply 500 when an unknown error occured when try to access file', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);
        mockRequestRetrieveOriginal.session.get = jest.fn().mockReturnValue(uuid);
        /* (access as jest.Mock).mockImplementation(() => {
            throw new Error('Unknown error');
        });// THERE 6 */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('An error occurred: Unknown error')
        });
        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('An error occurred: Unknown error')
        });
    });

    it('should reply 500 when an unknown error occured in readFile', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);
        mockRequestRetrieveOriginal.session.get = jest.fn().mockReturnValue(uuid);
        /* (access as jest.Mock).mockResolvedValue(undefined); //there 7 */
        /* (readFile as jest.Mock).mockImplementation(() => {
            throw new Error('Unknown error');
        });//hey67 */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('An error occurred: Unknown error')
        });
        await requestDownload(mockRequestRetrieveOriginal, mockReply);
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('An error occurred: Unknown error')
        });
    });


    //case for requestEncryptedDownload -> file appeared in encrypted directory but doesn't have a encrypted header-> should remove that file and encrypt again
    it('should remove the old encrypted file and encrypt again when the old file was not properly encrypted', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);

        /* (createReadStream as jest.Mock).mockImplementationOnce(() => {
            const stream = new PassThrough();
            stream.push('not properly encrypted');
            stream.push(null); // End of stream
            return stream;
        })
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('default content');
                stream.push(null); // End of stream
                return stream;
            })
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('TSCreator Encrypted Datafile');
                stream.push(null); // End of stream
                return stream;
            }) //here 4 */
        /* (access as jest.Mock)
            .mockImplementation(() => Promise.resolve()); there 8 */

        /* (readFile as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve('not properly encrypted'))
            .mockImplementationOnce(() => Promise.resolve('default content'))
            .mockImplementationOnce(() => Promise.resolve('TSCreator Encrypted Datafile')) */ //hey8
        //(rm as jest.Mock).mockResolvedValue(undefined);
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /* expect(rm).toHaveBeenCalled();
        expect(checkHeader).toHaveBeenCalledTimes(3); */
        /* expect(runJavaEncrypt).toHaveBeenCalled(); */
        expect(mockReply.send).toHaveBeenCalledWith(
            Buffer.from('TSCreator Encrypted Datafile')
        );
    });

    //case for requestEncryptedDownload->need new encryption-> however mkdirp failed. should reply with 500 and "Failed to create encrypted directory with error " + e
    it('should reply with 500 when fail to create encrypted directory for the user', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);


        /* (createReadStream as jest.Mock)
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('default content');
                stream.push(null); // End of stream
                return stream;
            })//here5 */
        /*  (access as jest.Mock)
             .mockImplementationOnce(() => {
                 const error: NodeJS.ErrnoException = new Error('File not found');
                 error.code = 'ENOENT';
                 throw error;
             })
             .mockImplementationOnce(() => Promise.resolve()); //there 9 */

        /* (readFile as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve('default content'))
            (mkdirp as unknown as jest.Mock).mockImplementation(() => {
                throw new Error('Unknown error');
            }) */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /*  expect(runJavaEncrypt).not.toHaveBeenCalled();
         expect(checkHeader).toHaveBeenCalledTimes(1); */
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('Failed to create encrypted directory with error Unknown error')
        });
    });

    //case for requestEncryptedDownload->need new encryption->runJavaEncrypt failed. should reply with 500 and "Failed to encrypt datapacks with error " + e
    it('should reply with 500 when the java program failed to encrypt the file (i.e. runJavaEncrypt failed)', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);

        /* (createReadStream as jest.Mock)
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('default content');
                stream.push(null); // End of stream
                return stream;
            })//here6 */
        /*  (access as jest.Mock)
             .mockImplementationOnce(() => {
                 const error: NodeJS.ErrnoException = new Error('File not found');
                 error.code = 'ENOENT';
                 throw error;
             })
             .mockImplementationOnce(() => Promise.resolve()); //there 10 */

        /* (readFile as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve('default content'))
            (runJavaEncrypt as jest.Mock).mockImplementation(() => {
                return Promise.reject(new Error('Unknown error'));
            }) */
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /*  expect(runJavaEncrypt).toHaveBeenCalled();
         expect(checkHeader).toHaveBeenCalledTimes(1); */
        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('Failed to encrypt datapacks with error Unknown error')
        });
    });

    //case for requestEncryptedDownload->need new encryption->ranJavaEncrypt-> the result file doesn't pass the checkHeader check. should remove this newly generated file and reply with 422 and  error: errormsg
    it('should remove the newly generated file and reply with 422 when runJavaEncrypt did not properly encrypt the file (i.e. the result file did not pass the header check)', async () => {

        mockRequestEncryptedDownload.session.get = jest.fn().mockReturnValue(uuid);

        /* (createReadStream as jest.Mock)
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('default content');
                stream.push(null); // End of stream
                return stream;
            })
            .mockImplementationOnce(() => {
                const stream = new PassThrough();
                stream.push('not properly encrypted');
                stream.push(null); // End of stream
                return stream;
            }); //here7 */
        /* (access as jest.Mock)
            .mockImplementationOnce(() => {
                const error: NodeJS.ErrnoException = new Error('File not found');
                error.code = 'ENOENT';
                throw error;
            })
            .mockImplementationOnce(() => Promise.resolve()); //there11 */

        /* (readFile as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve('default content'))
            .mockImplementationOnce(() => Promise.resolve('not properly encrypted'));
        (runJavaEncrypt as jest.Mock).mockImplementation(() => {
            return Promise.reject(new Error('Unknown error'));
        }); */
        // (rm as jest.Mock).mockResolvedValue(undefined);
        await requestDownload(mockRequestEncryptedDownload, mockReply);
        /* expect(runJavaEncrypt).toHaveBeenCalled();
        expect(rm).toHaveBeenCalled(); */
        /*  expect(checkHeader).toHaveBeenCalledTimes(2); */
        expect(mockReply.status).toHaveBeenCalledWith(422);
        expect(mockReply.send).toHaveBeenCalledWith({
            error: expect.stringContaining('Java file was unable to encrypt the file testfile.txt, resulting in an incorrect encryption header.')
        });
    });


});
