var Connection = require('./Connection.js');
var ConnectionManager = require('./ConnectionManager.js');
var RoomServerManager = require('./RoomServerManager');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

var TURNBASED_OP_CONNECT = "CONNECT";
var TURNBASED_OP_SUBMIT_TURN = "SUBMIT_TURN";

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
        case TURNBASED_OP_CONNECT:
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
        case TURNBASED_OP_SUBMIT_TURN:
            var gameState = instance._game.onSubmitTurn(user, message.data);
            handleGameState(instance, gameState);
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
    return lobby.members.find(member => member._connection == connection);
}

function findUserInLobby(lobby, userId)
{
    return lobby.members.find(member => member.profileId == userId);
}

function broadcastToLobby(lobby, message)
{
    lobby.members.forEach(member => Connection.send(member._connection, message));
}

function disconnectLobby(lobby)
{
    lobby.members.forEach(member => ConnectionManager.removeConnection(member._connection._socket));
}

function handleGameState(instance, gameState)
{
    // Send
    gameState.event = "GAME_STATE";
    broadcastToLobby(instance._lobby, gameState);

    if (gameState.winners || gameState.close)
    {
        if (gameState.close)
        {
            logger.error("close requested: " + gameState.close);
        }

        // Looks like the game is finished!
        // ... tell stuff to BrainCloud
        disconnectLobby(instance._lobby)
        RoomServerManager.destroy(instance);
    }
}
