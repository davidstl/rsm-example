var Connection = require('./Connection.js');
var ConnectionManager = require('./ConnectionManager.js');
var InstanceManager = require('./InstanceManager.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

var TURNBASED_OP_CONNECT = "CONNECT";
var TURNBASED_OP_SUBMIT_TURN = "SUBMIT_TURN";

exports.onRecv = function(connection, message)
{
    var instance = InstanceManager.get(message.instanceId);
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
            if (!InstanceManager.connect(instance, message.userId))
            {
                return false;
            }
            connection.instance = instance;
            user._connection = connection;
            if (instance._ready && InstanceManager.isAllConnected(instance))
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

    if (gameState.winners || gameState.close)
    {
        // Looks like the game is finished!
        // ... tell stuff to BrainCloud
        disconnectLobby(instance._lobby)
        InstanceManager.destroy(instance);
    }
}
