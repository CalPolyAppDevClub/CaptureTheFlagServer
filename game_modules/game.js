const geoLib = require('geolib')
const clone = require('clone');
const Events = require('events');
const GameFailureReason = require('./GameFailureReason');

const MAX_PLAYERS_PER_TEAM = 15;
module.exports = class Game extends Events.EventEmitter {
    constructor(name, locationCallback) {
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
        }
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
        let playerNameTaken = false
        if (this._players.size === 0) {
            return false
        }
        Object.keys(this._players.keys).forEach(key => {
            if (this._players.get(key).name === name) {
                console.log(this._players.get(key).name)
                playerNameTaken = true
            } 
        })
        //console.log('name already taken')
        //console.log(playerNameTaken)
        if (playerNameTaken == false) {
            return false
        }
        return true
    }

    checkIfTeamExists(teamId) {
        return this._teams[teamId] != undefined
        
    }
        

    addPlayer(id, playerName) {
        if (this.checkIfAlreadyInGame(id)) {
            return GameFailureReason.PlayerAlreadyInGame;
        }
        if (this._players.size == MAX_PLAYERS_PER_TEAM) {
            return GameFailureReason.TooManyPlayers;
        }
        if (this.checkIfPlayerNameTaken(playerName)) {
            return GameFailureReason.NameAlreadyTaken
        }
        let player = new Player(playerName, '' + id);
        if (this._players.size == 0) {
            player.leader = true
        }
        this._players.set(id, player);
        this.emit('playerAdded', player)
    }

    updateLocation(id, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        }
        this._players.get(id).location = location
        this.emit('locationUpdate', id, location)
    }

    tagPlayerIfCloseEnough(playerToTagId, idOfTaggingPlayer) {
        if (this.gameState == this.gameStates.placeFlags) {
            let distanceBetweenPlayers = geoLib.getDistance(this._players.get(parseInt(playerToTagId)).location, 
                this._players.get(idOfTaggingPlayer).location);
            if (distanceBetweenPlayers <= 40) {
                this._players.get(parseInt(playerToTagId)).isTagged = true;
                this.emit('playerTagged', playerToTagId)
            } else {
                return GameFailureReason.PlayersNotCloseEnough;
            }
        } else {
            return GameFailureReason.IncorrectGameState;
        }
    }

    addFlag(location) {
        if (this.gameState == this.gameStates.placeFlags) {
            let flagId = this._flags.size + 1;
            let flag = new Flag(flagId, location);
            this._flags.set(flagId, flag);
            this.emit('flagAdded', flag)
        } else {
            throw new Error('InvalidStateError')
        }
        
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
        console.log("Team ID: " + teamId)
        //console.log('ID TYPE: ' + typeof id + ' teamIdType: ' + typeof teamId)
        this._teams[teamId].players.push(id)
        this.emit('playerJoinedTeam', String(id), teamId);
    }

    addTeam(teamName) {
        if (Object.keys(this._teams).length == 2) {
            console.log('should be returng errororororo')
            return GameFailureReason.tooManyTeams
        }
        let teamId = (Object.keys(this._teams).length + 1);
        let teamToAdd = new Team(teamName, teamId);
        this._teams[teamId] = teamToAdd;
        console.log(teamName)
        console.log(teamToAdd)
        this.emit('teamAdded', teamToAdd);
    }

    nextGameState() {
        if (this.gameState != this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
}



function convertMapToObject(map) {
    let objToReturn = {};
    map.forEach(function(value, key) {
        objToReturn[key] = value;
    })
    //console.log('object converted')
    //console.log(objToReturn)
    return objToReturn;
}

class Player {
    constructor(name, id) {
        this.name = name;
        this.location = null;
        this.flagHeld = false;
        this.teamName = null
        this.id = id;
        this.isTagged = false;
        this.leader = false;
    }
}

class Flag  {
    constructor(id, location) {
        this.id = id
        this.location = location;
        this.held = false;
    }
}

class Team {
    constructor(name, id) {
        this.id = id;
        this.name = name;
        this.players = new Array();
        this.flags = {};

    }
}

