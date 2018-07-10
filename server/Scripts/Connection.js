var ConnectionManager = require('./ConnectionManager.js');
var RoomServerManager = require('./RoomServerManager.js');
var log4js = require('log4js');
var logger = log4js.getLogger('main');

module.exports = class Connection
{
    constructor(socket)
    {
        this.socket = socket;
        this.id = socket.remoteAddress + ":" + socket.remotePort;
        this.backlog = '';
        this.roomServer = null;

        this.socket.on('data', this.onData.bind(this));
        this.socket.on('line', this.onLine.bind(this));
        this.socket.on('close', this.onClose.bind(this));
        this.socket.on('end', this.onEnd.bind(this));
        this.socket.on('error', this.onError.bind(this));
    }
    
    onData(data)
    {
        try
        {
            this.backlog += data;
            var n = this.backlog.indexOf('\n');
            // got a \n? emit one or more 'line' events
            while (~n)
            {
                this.socket.emit('line', this.backlog.substring(0, n))
                this.backlog = this.backlog.substring(n + 1)
                n = this.backlog.indexOf('\n')
            }
        }
        catch (e)
        {
            logger.error("Exception: " + e);
            ConnectionManager.removeConnection(this);
        }
    }

    onLine(line)
    {
        logger.debug("Incoming | " + line);
        var message = JSON.parse(line);
        if (!message)
        {
            logger.error("Bad json: " + message);
            ConnectionManager.removeConnection(this);
            return;
        }

        if (this.roomServer) // Send to the room server if connected
        {
            let member = this.roomServer.room.members.find(member => member.connection == this);
            if (!member)
            {
                logger.error("bad connection");
                ConnectionManager.removeConnection(this);
                return;
            }
            if (!this.roomServer.onRecv(member, message))
            {
                logger.error("bad message");
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
                logger.error("bad lobbyId");
                ConnectionManager.removeConnection(this);
                return;
            }
            
            // Find member in room
            let member = roomServer.room.members.find(member => member.profileId === message.profileId);
            if (!member)
            {
                logger.error("bad profileId");
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
            logger.error("bad connection");
            ConnectionManager.removeConnection(this);
            return;
        }
    }

    onClose(message)
    {
        logger.debug("Socket closing " + this.id);
        ConnectionManager.removeConnection(this);
    }

    onEnd(message)
    {
        // Flush remaining data
        if (this.backlog)
        {
            try
            {
                this.socket.emit('line', this.backlog)
            }
            catch (e)
            {
                logger.error("Exception: " + e);
            }
        }
        logger.debug("Socket ending " + this.id);
    }

    onError(error)
    {
        logger.debug("Socket error " + this.id + " | msg: " + error.message);
        ConnectionManager.removeConnection(this);
    }

    send(message)
    {
        if (!this.socket) return;
        this.socket.write(JSON.stringify(message) + '\n');
    }
}
