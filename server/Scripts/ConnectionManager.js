var Connection = require('./Connection.js');
var TurnBased = require('./TurnBased.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

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
    TurnBased.onUserDisconnected(connection);
}
