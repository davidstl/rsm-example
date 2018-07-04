var Connection = require('./Connection.js');
var Game = require('./CustomerCode/Game.js');
var TurnBased = require('./TurnBased.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

var INSTANCE_MANAGER_SECRET_TOKEN = "SuperSecretToken";

var INSTANCE_MANAGER_OP_CREATE = "CREATE";

var instances = {};

function createInstance(instanceId, lobby)
{
    if (!instanceId) return false;
    if (!lobby) return false;

    var instance = {
        _id: instanceId,
        _lobby: lobby,
        _ready: false,
        _timeCreated: new Date().getMilliseconds() // For timeout
    };

    instances[instanceId] = instance;

    instance._game = new Game();
    instance._game.init(lobby, function(){
        instance._ready = true
        if (exports.isAllConnected(instance))
        {
            TurnBased.startMatch(instance);
        }
    });

    logger.info("Created instance: " + instanceId);

    return instance;
}

exports.get = function(instanceId)
{
    if (!instances.hasOwnProperty(instanceId)) return null;
    return instances[instanceId];
}

exports.connect = function(instance, userId)
{
    var user = null;
    var found = false;

    for (var i = 0; i < instance._lobby.teams.length; ++i)
    {
        var team = instance._lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            if (user.id == userId)
            {
                if (!user.isConnected)
                {
                    user.isConnected = true;
                    return true;
                }
                return false; // Already connected
            }
        }
    }

    return false; // Didn't find it
}

exports.isAllConnected = function(instance)
{
    for (var i = 0; i < instance._lobby.teams.length; ++i)
    {
        var team = instance._lobby.teams[i];
        for (var j = 0; j < team.users.length; ++j)
        {
            var user = team.users[j];
            if (!user.isConnected)
            {
                return false;
            }
        }
    }

    return true;
}

exports.destroy = function(instance)
{
    if (instance.hasOwnProperty(instance._id))
    {
        delete instance[instance._id];
    }
}

exports.onRecv = function(connection, message)
{
    // Validate that it comes from RTT services    
    if (message.token != INSTANCE_MANAGER_SECRET_TOKEN)
    {
        return false;
    }

    switch (message.op)
    {
        case INSTANCE_MANAGER_OP_CREATE:
            var instance = createInstance(message.instanceId, message.lobby);
            if (instance)
            {
                var response = {
                    service: message.service,
                    op: message.op,
                    status: 200
                };
                Connection.send(connection, response);
                return true;
            }
            return false;
        default:
            return false;
    }
}
