var Connection = require('./Connection.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

// TurnBased
var TurnBasedRS = require('./TurnBasedRoomServer');
var Game = require('./CustomerCode/Game.js');
// Relay
var RelayRS = require('./RelayRoomServer');

var INSTANCE_MANAGER_SECRET_TOKEN = "SuperSecretToken";

var INSTANCE_MANAGER_OP_CREATE = "CREATE";

var instances = {};

exports.createRoomInstance = function(instanceId, lobby)
{
    return createInstance(instanceId, lobby);
}

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
            TurnBasedRS.startMatch(instance);
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
    for (var i = 0; i < instance._lobby.members.length; ++i)
    {
        var user = instance._lobby.members[i];
        if (user.profileId === userId)
        {
            if (!user.isConnected)
            {
                user.isConnected = true;
                return true;
            }
            logger.error("Already connected: " + userId);
            return false; // Already connected
        }
    }

    logger.error("User not part of room: " + instance._lobby.id + ", for user: " + userId);
    return false; // Didn't find it
}

exports.isAllConnected = function(instance)
{
    return instance._lobby.members.every(member => member.isConnected);
}

exports.destroy = function(instance)
{
    if (instance.hasOwnProperty(instance._id))
    {
        delete instance[instance._id];
    }
}
