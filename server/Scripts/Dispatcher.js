var InstanceManager = require('./InstanceManager.js');
var TurnBased = require('./TurnBased.js');

exports.dispatch = function(connection, message)
{
    switch (message.service)
    {
        case "InstanceManager":
            return InstanceManager.onRecv(connection, message);
        case "TurnBased":
            return TurnBased.onRecv(connection, message);
        default:
            return false;
    }
}
