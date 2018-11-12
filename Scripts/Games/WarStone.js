// The Game class has to defined 4 methods:
//
// constructor(lobby)
// onStart()
// onSubmitTurn(user, data)
// onLeave(user) 
//
// Each of these will return an object containing the gamestate
// {
//     "turn": "userId",    // Whos turn it is now
//     "winners": [ ... ],  // This should be there if the game is completed, list of winning users.
//     "close": "reason",   // Terminate the game with a reason message
//     "data": { ... }      // Game data to be represented on the client
// }

var brainclouds2s = require('brainclouds2s');
var S2S = require('../S2S.js');

var CARD_TYPE_SKIP_TURN = "SkipTurnSpell";
var CARD_TYPE_BLOCK= "BarrierSpell";

module.exports = class WarStone
{
    constructor()
    {
        this.serializeDeck = function(deck)
        {
            var ret = [];
            for (var i = 0; i < deck.length; ++i)
            {
                var card = deck[i];
                ret.push(card._id);
            }
            return ret;
        }

        this.serializePlayer = function(player)
        {
            var ret = {
                id: player.profileId,
                name: player.name,
                hp: player._hp,
                hpCap: player._hpCap,
                energy: player._energy,
                energyCap: player._energyCap,
                deck: this.serializeDeck(player.deck),
                hand: this.serializeDeck(player.hand),
                discarded: this.serializeDeck(player.discarded),
                board: this.serializeDeck(player.board)
            };
            return ret;
        }

        this.serialize = function()
        {
            var ret = {
                turn: this._currentPlayer ? this._currentPlayer.profileId : null,
                data: {
                    player1: this._player1 ? this.serializePlayer(this._player1) : null,
                    player2: this._player2 ? this.serializePlayer(this._player2) : null
                }
            };

            return ret;
        }

        this.shuffle = function(cards)
        {
            var j, x, i;
            for (i = cards.length - 1; i > 0; i--)
            {
                j = Math.floor(Math.random() * (i + 1));
                x = cards[i];
                cards[i] = cards[j];
                cards[j] = x;
            }
        }
        
        this.generateDeck = function(player, deckConfig)
        {
            player.deck = [];
            player.hand = [];
            player.discarded = [];
            player.board = [];

            let deckArr = [];
            for (var cardId in deckConfig.Deck)
            {
                deckArr.push({id: cardId, count: deckConfig.Deck[cardId]});
            }
            deckArr.sort((a, b) => a.id < b.id);
            deckConfig.DeckArr = deckArr;

            var uniqueId = 0;
            deckArr.forEach(deckCard =>
            {
                for (var i = 0; i < deckCard.count; ++i)
                {
                    var cardType = this._config.cards[deckCard.id];
                    var card = {
                        _id: uniqueId++,
                        _type: cardType,
                        _hp: cardType.HP
                    };
                    player.deck.push(card);
                }
            });

            // Shuffle the deck
            this.shuffle(player.deck);

            // Put the cards from the top in hand
            for (var i = 0; i < this._config.HandSizeStart; ++i)
            {
                player.hand.push(player.deck.splice(0, 1)[0]);
            }
        }

        this.createPlayer = function(user, deckConfig)
        {
            var player = user;
            player._hp = this._config.PlayerHPStart;
            player._hpCap = this._config.PlayerHPCap;
            player._energyCap = this._config.EnergyStart;
            player._energy = this._config.EnergyStart;

            // State stuff
            player.skipNextTurn = false;
            player.spelled = false;
            player.drawnCount = 0;
            player.placed = false;
            player.moved = [];
    
            this.generateDeck(player, deckConfig);
            return player;
        }

        this.getConfig = function(callback)
        {
            var game = this;
            brainclouds2s.request(S2S.context, {
                "service": "script",
                "operation": "RUN",
                "data": {
                    "scriptName": "getProperties"
                }
            }, function(context, data) {
                game._config = data.data.response
                callback();
            });
        }
    }
    
    init(lobby, readyCallback)
    {
        this._config = {};
        this._lobby = lobby;

        var game = this;

        // Fetch configs from braincloud
        this.getConfig(function()
        {
            // Pick the standard deck from config and generate the player's cards
            var DECK_TYPE = "Standard";
            var deckConfig = null;
            for (var deckId in game._config.decks)
            {
                deckConfig = game._config.decks[deckId];
                if (deckConfig.Name == DECK_TYPE)
                {
                    break;
                }
            }
            game._config.deck = deckConfig.Deck;
            game._config.PlayerHPCap += deckConfig.PlayerHPBonus;
            game._config.PlayerHPStart += deckConfig.PlayerHPBonus;

            // Proceed to create players and decks and such
            game._player1 = game.createPlayer(game._lobby.members[0], deckConfig);
            game._player2 = game.createPlayer(game._lobby.members[1], deckConfig);

            game._config.deckArr = deckConfig.DeckArr;
            
            delete game._config.decks;

            // Pick a random user to start
            if (Math.random() < .5)
            {
                game._currentPlayer = game._player1;
            }
            else
            {
                game._currentPlayer = game._player2;
            }
            
            readyCallback();
        });
    }

    onStart()
    {
        var ret = this.serialize();
        ret.data.config = this._config; // Include config in the first gamestate
        return ret;
    }

    onSubmitTurn(user, data)
    {
        // Lot of error checking here... because cheaters
        if (this._currentPlayer.profileId != user.profileId)
        {
            return {close: "wrong player"};
        }
        if (!data)
        {
            return {close: "empty data"};
        }
        if (!data.action)
        {
            return {close: "missing action"};
        }

        var action = data.action;
        if (this._currentPlayer.drawnCount < this._config.DrawCountOnTurn && action.action != "draw")
        {
            return {close: "first " + this._config.DrawCountOnTurn + " action(s) should be \"draw\""};
        }

        switch (action.action)
        {
            case "draw":
            {
                if (this._currentPlayer.drawnCount >= this._config.DrawCountOnTurn) // First draw actions are free
                {
                    if (this._currentPlayer._energy < this._config.DrawCost)
                    {
                        return {close: "not enough enermgy to draw card"};
                    }
                    else
                    {
                        this._currentPlayer._energy -= this._config.DrawCost;
                    }
                }
                var card = this._currentPlayer.deck.splice(0, 1)[0];
                if (card._id != action.cardId)
                {
                    return {close: "invalid draw"};
                }
                this._currentPlayer.hand.push(card);
                // Reshuffle discarded if deck is empty
                if (this._currentPlayer.deck.length == 0)
                {
                    for (var i = 0; i < this._currentPlayer.discarded.length; ++i)
                    {
                        this._currentPlayer.deck.push(this._currentPlayer.discarded[i]);
                    }
                    this._currentPlayer.discarded = [];
                    this.shuffle(this._currentPlayer.deck);
                }
                this._currentPlayer.drawnCount++;
                break;
            }
            case "place":
            {
                var card = null;
                var handIndex = -1;
                for (var i = 0; i < this._currentPlayer.hand.length; ++i)
                {
                    var handCard = this._currentPlayer.hand[i];
                    if (handCard._id == action.cardId)
                    {
                        card = handCard;
                        handIndex = i;
                        break;
                    }
                }
                if (!card)
                {
                    return {close: "invalid card id or card not in hand"};
                }
                if (this._currentPlayer._energy < card._type.Cost)
                {
                    return {close: "not enough energy to play this card. player: " + this._currentPlayer._energy + ", card: " + JSON.stringify(card)};
                }
                if (this._currentPlayer.board.length >= this._config.MaxOnBoard)
                {
                    return {close: "board is full"};
                }
                card._hp = card._type.HP;
                this._currentPlayer._energy -= card._type.Cost;
                this._currentPlayer.hand.splice(handIndex, 1)
                this._currentPlayer.board.push(card);
                if (card._type.SleepOnStartTurns > 0)
                    this._currentPlayer.moved.push(card);
                break;
            }
            case "attack":
            {
                try
                {
                    var attackerCard = null;
                    var attackerBoardIndex = -1;
                    var defenderCard = null;
                    var defenderBoardIndex = -1;
                    for (var i = 0; i < this._currentPlayer.board.length; ++i)
                    {
                        var boardCard = this._currentPlayer.board[i];
                        if (boardCard._id == action.cardId)
                        {
                            attackerCard = boardCard;
                            attackerBoardIndex = i;
                            break;
                        }
                    }
                    var opponentPlayer = (this._currentPlayer == this._player1) ? this._player2 : this._player1;
                    for (var i = 0; i < opponentPlayer.board.length; ++i)
                    {
                        var boardCard = opponentPlayer.board[i];
                        if (boardCard._id == action.targetCardId)
                        {
                            defenderCard = boardCard;
                            defenderBoardIndex = i;
                            break;
                        }
                    }

                    if (!attackerCard)
                    {
                        return {close: "invalid attacker card id or card not on board"};
                    }
                    if (this._currentPlayer.moved.includes(attackerCard))
                    {
                        return {close: "attacker card already attacked or was placed this turn"};
                    }
                    if (!defenderCard)
                    {
                        return {close: "invalid defender card id or card not on board"};
                    }

                    this._currentPlayer.moved.push(attackerCard);

                    // Battle!
                    var attackerMultiplier = this._config.suits[attackerCard._type.Suit][defenderCard._type.Suit];
                    var defenderMultiplier = this._config.suits[defenderCard._type.Suit][attackerCard._type.Suit];
                    defenderCard._hp = Math.max(0, defenderCard._hp - Math.floor(attackerCard._type.Attack * attackerMultiplier));
                    attackerCard._hp = Math.max(0, attackerCard._hp - Math.floor(defenderCard._type.Attack * defenderMultiplier));

                    // Destroy cards
                    if (attackerCard._hp == 0)
                    {
                        this._currentPlayer.discarded.push(this._currentPlayer.board.splice(attackerBoardIndex, 1)[0]);
                    }
                    if (defenderCard._hp == 0)
                    {
                        opponentPlayer.discarded.push(opponentPlayer.board.splice(defenderBoardIndex, 1)[0]);
                    }
                }
                catch (e)
                {
                    console.log(e + ", " + e.stack);
                    return {close: "invalid move"};
                }
                break;
            }
            case "attackPlayer":
            {
                var attackerCard = null;
                var attackerBoardIndex = -1;
                for (var i = 0; i < this._currentPlayer.board.length; ++i)
                {
                    var boardCard = this._currentPlayer.board[i];
                    if (boardCard._id == action.cardId)
                    {
                        attackerCard = boardCard;
                        attackerBoardIndex = i;
                        break;
                    }
                }
                var opponentPlayer = (this._currentPlayer == this._player1) ? this._player2 : this._player1;

                if (!attackerCard)
                {
                    return {close: "invalid attacker card id or card not on board"};
                }
                if (this._currentPlayer.moved.includes(attackerCard))
                {
                    return {close: "attacker card already attacked or was placed this turn"};
                }

                this._currentPlayer.moved.push(attackerCard);

                opponentPlayer._hp = Math.max(0, opponentPlayer._hp - attackerCard._type.Attack);
                break;
            }
            case "spell":
            {
                var card = null;
                var handIndex = -1;
                for (var i = 0; i < this._currentPlayer.hand.length; ++i)
                {
                    var handCard = this._currentPlayer.hand[i];
                    if (handCard._id == action.cardId)
                    {
                        card = handCard;
                        handIndex = i;
                        break;
                    }
                }
                if (!card)
                {
                    return {close: "invalid card id or card not in hand"};
                }
                if (card._type.id != CARD_TYPE_SKIP_TURN)
                {
                    return {close: "card is not a spell"};
                }
                if (this._currentPlayer._energy < card._type.Cost)
                {
                    return {close: "not enough energy to play this card"};
                }
                this._currentPlayer._energy -= card._type.Cost;
                this._currentPlayer.skipNextTurn = true;
                this._currentPlayer.spelled = true;
                this._currentPlayer.hand.splice(handIndex, 1);
                this._currentPlayer.discarded.push(card);
                break;
            }
            case "advance":
            {
                // Move to the next turn
                if (!this._currentPlayer.skipNextTurn)
                {
                    this._currentPlayer = (this._currentPlayer == this._player1) ? this._player2 : this._player1;
                }

                // Increment energy
                this._currentPlayer._energyCap = Math.min(this._config.EnergyCap, this._currentPlayer._energyCap + 1);
                this._currentPlayer._energy = this._currentPlayer._energyCap;

                // Reset state stuff for next turn player
                this._currentPlayer.skipNextTurn = false;
                this._currentPlayer.spelled = false;
                this._currentPlayer.drawnCount = 0;
                this._currentPlayer.moved = [];
                break;
            }
            default:
                return {close: "invalid action:" + action.action};
        }

        var ret = this.serialize();
        ret.data.previousTurn = {
            userId: user.profileId,
            action: data.action
        }

        if (this._player1._hp <= 0 && this._player2._hp <= 0)
        {
            ret.winners = [];
        }
        else if (this._player1._hp <= 0)
        {
            ret.winners = [this._player2.profileId];
        }
        else if (this._player2._hp <= 0)
        {
            ret.winners = [this._player1.profileId];
        }

        return ret;
    }

    onLeave(user)
    {
        var ret = this.serialize();
        ret.close = user.name + " disconneted";
        return ret;
    }
}
