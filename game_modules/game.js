const geoLib = require('geolib');
const clone = require('clone');
const Events = require('events');
const GameFailureReason = require('./GameFailureReason');

const MAX_PLAYERS_PER_TEAM = 15;
module.exports = class Game extends Events.EventEmitter {
    constructor(name) {
        super();
        this._players = new Map();
        this._flags = new Map();
        this._teams = {};
        this.name = name;
        this.gameStates = {
            lobby : 0,
            placeFlags : 1,
            gameInProgress : 2,
            gameEnd : 3
        };
        this.gameState = this.gameStates.lobby;
    }

    getState() {
        return this.gameState
    }

    getPlayerInfo(id) {
        return clone(this._players.get(id))
    }

    getPlayers() {
        return clone(convertMapToObject(this._players));
    }

    checkIfAlreadyInGame(id) {
        //console.log(this._players.has(id))
        return this._players.has(id)
    }

    checkIfPlayerNameTaken(name) {
        let playerNameTaken = false;
        if (this._players.size === 0) {
            return false
        }
        Object.keys(this._players.keys).forEach(key => {
            if (this._players.get(key).name === name) {
                console.log(this._players.get(key).name);
                playerNameTaken = true
            } 
        });
        //console.log('name already taken')
        //console.log(playerNameTaken)
        return playerNameTaken !== false;

    }

    checkIfTeamExists(teamId) {
        return this._teams[teamId] !== undefined
        
    }
        

    addPlayer(id, playerName) {
        if (this.checkIfAlreadyInGame(id)) {
            return GameFailureReason.PlayerAlreadyInGame;
        }
        if (this._players.size === MAX_PLAYERS_PER_TEAM) {
            return GameFailureReason.TooManyPlayers;
        }
        if (this.checkIfPlayerNameTaken(playerName)) {
            return GameFailureReason.NameAlreadyTaken
        }
        let player = new Player(playerName, '' + id);
        if (this._players.size === 0) {
            player.leader = true
        }
        this._players.set(id, player);
        this.emit('playerAdded', player)
    }

    updateLocation(id, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        };
        this._players.get(id).location = location;
        this.emit('locationUpdate', id, location)
    }

    tagPlayer(playerToTagId, idOfTaggingPlayer) {
        if (this.gameState != this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        let distanceBetweenPlayers = geoLib.getDistance(this._players.get(playerToTagId).location, 
            this._players.get(idOfTaggingPlayer).location)
        if (distanceBetweenPlayers <= 4000000000000000000) {
            this._players.get(playerToTagId).isTagged = true
            let flagHeldLocation = null
            if (this._players.get(playerToTagId).flagHeld !== null) {
                flagHeldLocation = this._players.get(playerToTagId).location
            }
            this.emit('playerTagged', playerToTagId, flagHeldLocation)
        } else {
            return GameFailureReason.playersNotCloseEnough
        }
    }

    addFlag(idOfAdder, location) {
        if (this.gameState !== this.gameStates.placeFlags) {
            return GameFailureReason.incorrectGameState
        }
        if (!this._players.get(idOfAdder).leader) {
            return GameFailureReason.playerDoesNotHavePermission
        }
        console.log('flag added passed the tests');
        let flagId = this._flags.size + 1;
        let flag = new Flag('' + flagId, location);
        this._flags.set('' + flagId, flag);
        let teamId;
        if (this._teams[1].containsPlayer(idOfAdder.toString())) {
            teamId = this._teams[1].id
            this._teams[teamId].flags.push(flagId.toString())
        } else {
            teamId = this._teams[2].id
            this._teams[teamId].flags.push(flagId.toString())
        }
        this.emit('flagAdded', flag, teamId)
    }

    pickUpFlag(flagId, playerId) {
        console.log('playerId typeof')
        console.log(typeof playerId)
        console.log('flagid typeof')
        console.log(typeof flagId)
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (getTeamOf.call(this, 'flag', flagId) === getTeamOf.call(this, 'player', playerId)) {
            return GameFailureReason.cannotPickUpFlag
        }
        if (geoLib.getDistance(this._players.get(playerId).location, this._flags.get(flagId).location) >= 4000000000000000000) {
            return GameFailureReason.cannotPickUpFlag
        }
        this._players.get(playerId).flagHeld = flagId
        this._flags.get(flagId).held = true;
        this.emit('flagPickedUp', flagId, playerId)
    }

    getFlags() {
        return clone(convertMapToObject(this._flags))
    }

    getTeams() {
        return clone(this._teams)
    }

    removePlayer(id) {
        this._players.delete(id);
        this.emit('playerRemoved', String(id))
    }



    addToTeam(id, teamId) {
        console.log("Team ID: " + teamId);
        //console.log('ID TYPE: ' + typeof id + ' teamIdType: ' + typeof teamId)
        this._teams[teamId].players.push('' + id);
        this.emit('playerJoinedTeam', String(id), teamId);
    }

    addTeam(teamName) {
        if (Object.keys(this._teams).length === 2) {
            console.log('should be returng errororororo');
            return GameFailureReason.tooManyTeams
        }
        let teamId = (Object.keys(this._teams).length + 1);
        let teamToAdd = new Team(teamName, teamId);
        this._teams[teamId] = teamToAdd;
        console.log(teamName);
        console.log(teamToAdd);
        this.emit('teamAdded', teamToAdd);
    }


    nextGameState() {
        if (this.gameState !== this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
};

function getTeamOf(type, id) {
    switch (type) {
        case 'player':
            if (this._teams[1].containsPlayer(id)) {
                return this._teams[1]
            }
            if (this._teams[2].containsPlayer(id)) {
                return this._teams[2]
            }
            break
        case 'flag':
            if (this._teams[1].containsFlag(id)) {
                return this._teams[1]
            }
            if (this._teams[2].containsFlag(id)) {
                return this._teams[2]
            }
            break
        default:
            break
    }
}

function convertMapToObject(map) {
    let objToReturn = {};
    map.forEach(function(value, key) {
        objToReturn[key] = value;
    });
    //console.log('object converted')
    //console.log(objToReturn)
    return objToReturn;
}

class Player {
    constructor(name, id) {
        this.name = name;
        this.location = null;
        this.flagHeld = null;
        this.id = id;
        this.isTagged = false;
        this.leader = true;
    }
}

class Flag  {
    constructor(id, location) {
        this.id = id;
        this.location = location;
        this.held = false;
    }
}

class Team {
    constructor(name, id) {
        this.id = id;
        this.name = name;
        this.players = new Array();
        this.flags = new Array();
    }
    containsPlayer(playerId) {
        let contains = false
        this.players.forEach(function(item) {
            if (item === playerId) {
                contains = true
                return
            }
        })
        return contains
    }
    containsFlag(flagId) {
        let contains = false
        this.flags.forEach(function(item) {
            if (item === flagId) {
                contains = true
                return
            }
        })
        return contains
    }
}
