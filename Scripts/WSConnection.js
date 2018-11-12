var ConnectionManager = require('./ConnectionManager.js');
var RoomServerManager = require('./RoomServerManager.js');

module.exports = class WSConnection
{
    constructor(socket)
    {
        this.socket = socket;
        this.id = Math.random().toString(36).substr(2, 9);
        this.backlog = '';
        this.roomServer = null;

        this.socket.on('close', this.onClose.bind(this));
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('message', this.onMessage.bind(this));
    }
    
    onMessage(messageRaw)
    {
        console.log("Incoming | " + messageRaw);
        var message = JSON.parse(messageRaw);
        if (!message)
        {
            console.log("ERROR " + "Bad json: " + message);
            ConnectionManager.removeConnection(this);
            return;
        }

        if (this.roomServer) // Send to the room server if connected
        {
            let member = this.roomServer.room.members.find(member => member.connection == this);
            if (!member)
            {
                console.log("ERROR " + "bad connection");
                ConnectionManager.removeConnection(this);
                return;
            }
            if (!this.roomServer.onRecv(member, message))
            {
                console.log("ERROR " + "bad message");
                ConnectionManager.removeConnection(this);
                return;
            }
        }
        else if (message.op === "CONNECT") // Check if its a connect msg
        {
            // Find room
            let roomServer = RoomServerManager.getRoomServer(message.lobbyId);
            if (!roomServer)
            {
                console.log("ERROR " + "bad lobbyId");
                ConnectionManager.removeConnection(this);
                return;
            }
            
            // Find member in room
            let member = roomServer.room.members.find(member => member.profileId === message.profileId);
            if (!member)
            {
                console.log("ERROR " + "bad profileId");
                ConnectionManager.removeConnection(this);
                return;
            }

            // Connected!
            member.connection = this;
            this.roomServer = roomServer;
            roomServer.onMemberConnected(member);
        }
        else // Bad message, kick him
        {
            console.log("ERROR " + "bad connection");
            ConnectionManager.removeConnection(this);
            return;
        }
    }

    onClose(message)
    {
        console.log("Socket closing " + this.id);
        ConnectionManager.removeConnection(this);
    }

    onError(error)
    {
        console.log("Socket error " + this.id + " | msg: " + error.message);
        ConnectionManager.removeConnection(this);
    }

    send(message)
    {
        if (!this.socket) return;
        this.socket.send(JSON.stringify(message));
    }
}
