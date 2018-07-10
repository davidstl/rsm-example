// Imports
var net = require('net');
var log4js = require('log4js');
var RoomServerManager = require('./RoomServerManager.js')
var ConnectionManager = require('./ConnectionManager.js');

log4js.configure({
	appenders: {
		out: {type: 'stdout', layout: {type: 'basic'}},
		app: {type: 'file', layout: {type: 'basic'}, filename: '/log/turnbased.log', maxLogSize: 10485760, backups: 5}
	},
	categories: {
		default: {appenders: ['out', 'app'], level: 'debug'}
	}
});

var logger = log4js.getLogger('main');

// Constants
var HTTP_PORT = 9306;
var TCP_PORT = 9308;

// Create the HTTP listener
var express = require('express');
var app = express()
var qs = require('querystring');

app.get('/', (request, res) =>
{
    logger.info("----------------------------------------------------\nbad request"); 
    let query = require('url').parse(request.url, true).query;
    logger.info("query: " + JSON.stringify(query));
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.write('bad request');
    res.end();
});

function readPOSTData(request, callback)
{
    var body = '';

    request.on('data', (data) =>
    {
        body += data;

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
        {
            request.connection.destroy();
        }
    });

    request.on('end', () =>
    {
        logger.info("----------------------------------------------------\nHeaders: " + JSON.stringify(request.headers));
        logger.info("POST: " + body);

        callback(body);
    });
}

app.post('/bcrsm/room-assign', (request, res) => readPOSTData(request, data =>
{
    let room = JSON.parse(data);

    if (!RoomServerManager.createRoomServer(room))
    {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.write(`bad request`);
        res.end();
        return;
    }

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(`{"url":"207.219.200.99","port":"${TCP_PORT}","roomId":"${room.id}"}`);
    res.end();
}));

app.post('/bcrsm/room-launch', (request, res) => readPOSTData(request, data =>
{
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('{}');
    res.end();
}));

app.listen(HTTP_PORT);
logger.info("HTTP server listning on port " + HTTP_PORT);

// Create our TCP server
var server = net.createServer();
server.listen(TCP_PORT);
logger.info("TCP server listning on port " + TCP_PORT);

// Receive connections
server.on('connection', function(socket)
{
    if (!socket)
    {
        logger.error("connection with undefined socket!");
        return;
    }
	try
	{
		logger.info("Received connection - " + socket.remoteAddress + ":" + socket.remotePort);
        ConnectionManager.createConnection(socket);
	}
	catch (e)
	{
		logger.error("Exception: " + e);
	}
});
