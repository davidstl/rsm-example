var Connection = require('./Connection.js');
var WSConnection = require('./WSConnection.js');

var connections = [];

exports.getConnection = function(id)
{
    return connections.find(connection => connection.id === id);
}

exports.createConnection = function(socket)
{
    var newConnection = new Connection(socket);

    connections = connections.filter(connection => connection.id !== newConnection.id);
    connections.push(newConnection);

    return newConnection;
}

exports.createWSConnection = function(socket)
{
    var newConnection = new WSConnection(socket);

    connections = connections.filter(connection => connection.id !== newConnection.id);
    connections.push(newConnection);

    return newConnection;
}

exports.removeConnection = function(connectionToRemove)
{
    if (!connectionToRemove) return;

    connections = connections.filter(connection => connection.id !== connectionToRemove.id);
    if (connectionToRemove.socket)
    {
        if (connectionToRemove.socket.destroy)
        {
            connectionToRemove.socket.destroy();
        }
        connectionToRemove.socket = null;
    }

    console.log("Removed connection: " + connectionToRemove.id + ", stack: " + new Error().stack);

    if (connectionToRemove.roomServer)
    {
        let member = connectionToRemove.roomServer.room.members.find(member => member.connection === connectionToRemove);
        if (member)
        {
            member.connection = null;
            connectionToRemove.roomServer.onMemberDisconnected(member);
        }
    }
}
