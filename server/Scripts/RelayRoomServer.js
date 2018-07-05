var Connection = require('./Connection.js');
var ConnectionManager = require('./ConnectionManager.js');
var RoomServerManager = require('./RoomServerManager');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

var RELAY_ROOM_OP_CONNECT = "CONNECT";
var RELAY_OP_SUBMIT_TURN = "SEND_EVENT";

exports.onRecv = function(connection, message)
{
    var instance = RoomServerManager.get(message.instanceId);
    if (!instance)
    {
        logger.error("Game instance not found: " + message.instanceId);
        return false;
    }

    var user = findUserInLobby(instance._lobby, message.userId);
    if (!user)
    {
        logger.error("User not found " + message.userId + " instance " + instance._id);
        return false;
    }

    switch (message.op)
    {
        case RELAY_ROOM_OP_CONNECT:
            if (!RoomServerManager.connect(instance, message.userId))
            {
                return false;
            }
            connection.instance = instance;
            user._connection = connection;
            if (instance._ready && RoomServerManager.isAllConnected(instance))
            {
                exports.startMatch(instance);
            }
            return true;
        case RELAY_OP_SUBMIT_TURN:
            handleGameState(instance.lobby, message);
            return true;
        default:
            logger.error("Invalid op: " + message.op);
            return false;
    }
}

exports.onUserDisconnected = function(connection)
{
    if (connection.instance)
    {
        var user = findUserByConnection(connection.instance._lobby, connection)
        if (user)
        {
            var gameState = connection.instance._game.onLeave(user);
            handleGameState(connection.instance, gameState);
        }
    }
}

exports.startMatch = function(instance)
{
    var gameState = instance._game.onStart();
    handleGameState(instance, gameState);
}

function findUserByConnection(lobby, connection)
{
    for (var i = 0; i < lobby.teams.length; ++i)
    {
        var team = lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            if (user._connection == connection)
            {
                return user;
            }
        }
    }
    return null;
}

function findUserInLobby(lobby, userId)
{
    for (var i = 0; i < lobby.teams.length; ++i)
    {
        var team = lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            if (user.id == userId)
            {
                return user;
            }
        }
    }
    return null;
}

function broadcastToLobby(lobby, message)
{
    for (var i = 0; i < lobby.teams.length; ++i)
    {
        var team = lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            Connection.send(user._connection, message);
        }
    }
}

function disconnectLobby(lobby)
{
    for (var i = 0; i < lobby.teams.length; ++i)
    {
        var team = lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            ConnectionManager.removeConnection(user._connection._socket);
        }
    }
}

function handleGameState(instance, gameState)
{
    // Send
    gameState.event = "GAME_STATE";
    broadcastToLobby(instance._lobby, gameState);

    if (gameState.close)
    {
        RoomServerManager.destroy(instance);
    }
}