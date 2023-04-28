import fastify from 'fastify';
import cors from '@fastify/cors';
import 'fs';
import process from "process";
import { exec } from 'child_process';
//import getCharts from './tscreator/tscreator'
import chart_information from './chart_information.json' assert { type: "json" };
import fastifyStatic from '@fastify/static';
const server = fastify();
// @ts-ignore
server.register(fastifyStatic, {
    root: process.cwd() + '/files',
    prefix: '/files/',
});
for (let x in chart_information) {
    console.log(x + chart_information);
}
console.log(chart_information.charts);
console.log('length of json object = ' + chart_information);
console.log('here');
console.log('here');
// @ts-ignore
server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});
server.post('/charts', (request, reply) => {
    //reply.send(request.body.imgSrc);
    console.log(chart_information);
    //reply.send(chart_information);
    reply.send(chart_information);
});
server.post('/getchart', async (request, reply) => {
    console.log('here');
    console.log(request.body);
    const title = request.body.title;
    //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
    const jarArgs = ['java', '-jar', './jar/TSC.jar', '-node', '-s', `./files/${title}settings.tsc`, '-ss', `./files/${title}settings.tsc`, '-d', `./files/${title}datapack.txt`, '-o', `./files/${title}save.pdf`];
    //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
    console.log(jarArgs);
    //const child: ChildProcess = spawn('java', jarArgs);
    //
    await new Promise((resolve, reject) => {
        exec(jarArgs.join(" "), function (error, stdout, stderror) {
            var stdoutstring = stdout.toString();
            console.log("Child Created");
            console.log("Error: " + error);
            console.log("Data: " + stdoutstring);
            console.log("Standarad Error: " + stderror);
            console.log('sending reply');
            reply.send({ "url": `/files/${title}save.pdf` });
            resolve();
        });
    });
    /*
    let response: string = '';
    let error: string = '';
  
    child.stdout?.on('data', (data) => {
      response += data.toString();
    });
  
    console.log(response);
  
    child.stderr?.on('data', (data) => {
      error += data.toString();
    });
  
    //await new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        console.log(error);
        console.log('Child process exited with exit code ' + code);
      });
    //});
  
    //getCharts(title);
    */
});
const start = async () => {
    try {
        await server.listen({ port: 3000 });
        const address = server.server.address();
        const port = typeof address === 'string' ? address : address?.port;
        console.log(address + ' ' + port);
    }
    catch (err) {
        console.log("Server error: " + err);
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map