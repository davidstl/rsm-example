module.exports = class RoomServer
{
    constructor(room)
    {
        this.room = room;
    }

    isAllConnected()
    {
        return this.room.members.every(member => member.connection != null);
    }

    onMemberConnected(member)
    {
    }

    onMemberDisconnected(member)
    {
    }

    onRecv(member, message)
    {
        return false;
    }
}
