var ConnectionManager = require('./ConnectionManager.js');
var Dispatcher = require('./Dispatcher.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

exports.create = function(socket)
{
    var connection = {
        _socket: socket,
        _id: socket.remoteAddress + ":" + socket.remotePort,
        _backlog: ''
    };

    socket.on('data', function(data)
    {
        Connection_onData(connection, data);
    });
    socket.on('line', function(line)
    {
        Connection_onLine(connection, line);
    });
    socket.on('close', function(message)
    {
        Connection_onClose(connection);
    });
    socket.on('end', function(message)
    {
        Connection_onEnd(connection);
    });
    socket.on('error', function(error)
    {
        Connection_onError(connection, error);
    });

    return connection;
}

exports.send = function(connection, message)
{
    if (!connection) return
    connection._socket.write(JSON.stringify(message) + '\n');
}

function Connection_onData(connection, data)
{
    try
    {
        connection._backlog += data;
        var n = connection._backlog.indexOf('\n');
        // got a \n? emit one or more 'line' events
        while (~n)
        {
            connection._socket.emit('line', connection._backlog.substring(0, n))
            connection._backlog = connection._backlog.substring(n + 1)
            n = connection._backlog.indexOf('\n')
        }
    }
    catch (e)
    {
        logger.error("Exception: " + e);
        ConnectionManager.removeConnection(connection._socket);
    }
}

function Connection_onLine(connection, line)
{
    logger.debug("Incoming | " + connection + " | " + line);
    var message = JSON.parse(line);
    if (!message)
    {
        ConnectionManager.removeConnection(connection._socket);
        return;
    }
    if (!Dispatcher.dispatch(connection, message))
    {
        ConnectionManager.removeConnection(connection._socket);
        return;
    }
}

function Connection_onClose(connection, message)
{
    logger.debug("Socket closing " + connection._id);
    ConnectionManager.removeConnection(connection._socket);
}

function Connection_onEnd(connection, message)
{
    // Flush remaining data
    if (connection._backlog)
    {
        try
        {
            connection._socket.emit('line', connection._backlog)
        }
        catch (e)
        {
            logger.error("Exception: " + e);
        }
    }
    logger.debug("Socket ending " + connection._id);
}

function Connection_onError(connection, error)
{
    logger.debug("Socket error " + connection._id + " | msg: " + error.message);
    ConnectionManager.removeConnection(connection._socket);
}
