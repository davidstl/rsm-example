var RoomServer = require('./RoomServer.js');
var ConnectionManager = require('./ConnectionManager.js');
var RoomServerManager = require('./RoomServerManager.js');

module.exports = class TurnBasedRoomServer extends RoomServer
{
    constructor(room, gameName)
    {
        super(room);

        var Game = require(`./Games/${gameName}.js`)
        this.game = new Game();
    }

    onMemberConnected(member)
    {
        super.onMemberConnected(member);
        
        if (this.isAllConnected())
        {
            this.startMatch();
        }
    }

    onMemberDisconnected(member)
    {
        super.onMemberDisconnected(member);

        var gameState = this.game.onLeave(member);
        this.handleGameState(gameState);
    }

    startMatch()
    {
        this.game.init(this.room, () =>
        {
            let gameState = this.game.onStart();
            this.handleGameState(gameState);
        });
    }

    onRecv(member, message)
    {
        if (super.onRecv(member, message)) return true;

        switch (message.op)
        {
            case "SUBMIT_TURN":
                var gameState = this.game.onSubmitTurn(member, message.data);
                this.handleGameState(gameState);
                return true;
            default:
                console.log("ERROR " + "Invalid op: " + message.op);
                return false;
        }
    }

    handleGameState(gameState)
    {
        // Send
        gameState.event = "GAME_STATE";
        this.broadcastToRoom(gameState);
    
        if (gameState.winners || gameState.close)
        {
            if (gameState.close)
            {
                console.log("ERROR " + "close requested: " + gameState.close);
            }
    
            // Looks like the game is finished!
            // ... tell stuff to BrainCloud
            this.shutdown();
        }
    }

    shutdown()
    {
        this.room.members.forEach(member =>
        {
            ConnectionManager.removeConnection(member.connection);
        });
        RoomServerManager.removeRoomServer(this);
    }

    broadcastToRoom(message)
    {
        this.room.members.forEach(member =>
        {
            if (member.connection)
            {
                member.connection.send(message);
            }
        });
    }
}
