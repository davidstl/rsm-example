// Imports
var net = require('net');
var RoomServerManager = require('./RoomServerManager.js')
var ConnectionManager = require('./ConnectionManager.js');
const publicIp = require('public-ip');
var S2S = require('./S2S.js');

// Constants
var HTTP_PORT = 9306;
var TCP_PORT = 9308;

// Create the HTTP listener
var express = require('express');
var app = express()

var myPublicIp = "";
    
publicIp.v4().then(ip =>
{
    myPublicIp = ip;
    console.log("Public IP: " + myPublicIp);
    start();
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
        console.log("----------------------------------------------------\nHeaders: " + JSON.stringify(request.headers));
        console.log("POST: " + body);

        callback(body);
    });
}

function cancelRoom(roomId, msg)
{
    S2S.request({
        service: "lobby",
        operation: "SYS_ROOM_CANCELLED",
        data: {
            lobbyId: roomId,
            msg: msg,
            defailts: {}
        }
    });
}

function start()
{
    app.get('/', (request, res) =>
    {
        console.log("----------------------------------------------------\nbad request"); 
        let query = require('url').parse(request.url, true).query;
        console.log("query: " + JSON.stringify(query));
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.write('bad request');
        res.end();
    });

    app.post('/bcrsm/assign-room', (request, res) => readPOSTData(request, data =>
    {
        let room = JSON.parse(data);
    
        let roomServer = RoomServerManager.createRoomServer(room);
        if (!roomServer)
        {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.write(`bad request`);
            res.end();
            return;
        }
    
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(`{}`);
        res.end();

        S2S.request({
            service: "lobby",
            operation: "SYS_ROOM_ASSIGNED",
            data: {
                lobbyId: room.id,
                connectInfo: {
                    roomId: room.id,
                    url: myPublicIp,
                    port: TCP_PORT
                }
            }
        });
    }));
    
    app.post('/bcrsm/launch-room', (request, res) => readPOSTData(request, data =>
    {
        let room = JSON.parse(data);

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('{}');
        res.end();

        let roomServer = RoomServerManager.getRoomServer(room.id);

        if (roomServer)
        {
            S2S.request({
                service: "lobby",
                operation: "SYS_ROOM_READY",
                data: {
                    lobbyId: room.id,
                    connectInfo: {
                        roomId: room.id,
                        url: myPublicIp,
                        port: TCP_PORT
                    }
                }
            });
        }
        else
        {
            cancelRoom(room.id, "No roomServer found for roomId: " + room.id);
        }
    }));

    // app.post('/bcrsm/room-assign', (request, res) => readPOSTData(request, data =>
    // {
    //     let room = JSON.parse(data);
    
    //     let roomServer = RoomServerManager.createRoomServer(room);
    //     if (!roomServer)
    //     {
    //         res.writeHead(400, {'Content-Type': 'text/plain'});
    //         res.write(`bad request`);
    //         res.end();
    //         return;
    //     }
    
    //     res.writeHead(200, {'Content-Type': 'text/plain'});
    //     res.write(`{"roomId":${room.id},"url":${myPublicIp},"port":${TCP_PORT}}`);
    //     res.end();
    // }));
    
    // app.post('/bcrsm/launch-room', (request, res) => readPOSTData(request, data =>
    // {
    //     res.writeHead(200, {'Content-Type': 'text/plain'});
    //     res.write('{}');
    //     res.end();
    // }));
    
    app.listen(HTTP_PORT);
    console.log("HTTP server listning on port " + HTTP_PORT);
    
    // Create our TCP server
    var server = net.createServer();
    server.listen(TCP_PORT);
    console.log("TCP server listning on port " + TCP_PORT);
    
    // Receive connections
    server.on('connection', function(socket)
    {
        if (!socket)
        {
            console.log("ERROR " + "connection with undefined socket!");
            return;
        }
        try
        {
            console.log("Received connection - " + socket.remoteAddress + ":" + socket.remotePort);
            ConnectionManager.createConnection(socket);
        }
        catch (e)
        {
            console.log("ERROR " + "Exception: " + e);
        }
    });    
}
