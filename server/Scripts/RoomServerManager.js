let TurnBasedRoomServer = new require('./TurnBasedRoomServer.js');

let roomServers = [];

exports.createRoomServer = function(room)
{
    let roomServer = null;

    switch (room.appId)
    {
        case "":   // FILL ME
            roomServer = new TurnBasedRoomServer(room, "WarStone");
            break;
        default:
            return null;
    }

    if (roomServer)
    {
        roomServers.push(roomServer);
    }

    return roomServer;
}

exports.getRoomServer = function(id)
{
    return roomServers.find(roomServer => roomServer.room.id === id);
}

exports.removeRoomServer = function(roomServerToRemove)
{
    roomServers = roomServers.filter(roomServer => roomServer !== roomServerToRemove);
}
