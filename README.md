# Room Server Manager #

This Room Server Manager (RSM) is also running it's RoomServers (RS) inside the same instance. We have done this for simplicity.

The game the system hosts is **War Stone**, another brainCloud RTT example.
![](screenshots/warstone.png)

New test games can be added to the RSM example, in RoomServerManager.js:

```
switch (room.appId)
{
    case "22819":
        roomServer = new TurnBasedRoomServer(room, "WarStone");
        break;
    default:
        return null;
}
```

`TurnBasedRoomServer` is also re-usable for turn-based games.