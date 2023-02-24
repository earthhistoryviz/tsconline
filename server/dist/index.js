import fastify from 'fastify';
import cors from '@fastify/cors';
const server = fastify();
import chart_information from './chart_information.json' assert { type: "json" };
for (let x in chart_information) {
    console.log(x + chart_information);
}
console.log(chart_information.charts);
console.log('length of json object = ' + chart_information);
console.log('here');
console.log('here');
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
const start = async () => {
    try {
        await server.listen({ port: 3000 });
        const address = server.server.address();
        const port = typeof address === 'string' ? address : address?.port;
        console.log(address + ' ' + port);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map