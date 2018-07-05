var RoomServerManager = require('./RoomServerManager');
var TurnBasedRS = require('./TurnBasedRoomServer');
var RelayRS = require('./RelayRoomServer');

exports.dispatch = function(connection, message)
{
    switch (message.service)
    {
        case "InstanceManager":
            return RoomServerManager.onRecv(connection, message);
        case "TurnBased":
            return TurnBasedRS.onRecv(connection, message);
        case "Relay":
            return RelayRS.onRecv(connection, message);
        default:
            return false;
    }
}
