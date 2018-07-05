var Connection = require('./Connection.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

//i'd like to remove these
var TurnBasedRS = require('./TurnBasedRoomServer');
var RelayRS = require('./RelayRoomServer');

var connections = {};

exports.createConnection = function(socket)
{
    var connection = Connection.create(socket);
    connections[connection._id] = connection;
}

exports.removeConnection = function(socket)
{
    var connectionId = socket.remoteAddress + ":" + socket.remotePort;

    if (!connections.hasOwnProperty(connectionId)) return;
    var connection = connections[connectionId];
    delete connections[connectionId];
    socket.destroy();

    logger.info("Removed connection: " + connectionId);
    TurnBasedRS.onUserDisconnected(connection);
    RelayRS.onUserDisconnected(connection);
}
