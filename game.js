const geoLib = require('geolib')
const clone = require('clone');
const Events = require('events');

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
        return this._players.has(id)
    }
        

    addPlayer(id, playerName) {
        console.log("ADDING PLAYER: " + id + " " + playerName)
        let player = new Player(playerName, id);
        this._players.set(id, player);
        this.emit('playerAdded', id)
    }

    updateLocation(id, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        }
        this._players.get(id).location = location
        this.emit('locationUpdate', id, location)
    }

    tagPlayer(playerToTagId, idOfTaggingPlayer) {
        console.log('PLAYER TO TAG ID: ' + playerToTagId)
        console.log(playerToTagId + ", " + idOfTaggingPlayer)
        let distanceBetweenPlayers = geoLib.getDistance(this._players.get(parseInt(playerToTagId)).location, 
            this._players.get(idOfTaggingPlayer).location);
        if (distanceBetweenPlayers <= 40) {
            this._players.get(parseInt(playerToTagId)).isTagged = true;
            this.emit('playerTagged', playerToTagId)
            return true;
        }
        return false;
    }

    addFlag(location) {
        let flagId = this._flags.size + 1;
        let flag = new Flag(flagId, location);
        this._flags.set(flagId, flag);
    }

    getFlags() {
        return clone(convertMapToObject(this._flags))
    }

    getTeams() {
        return clone(this._teams)
    }

    removePlayer(id) {
        this._players.delete(id);
    }

    attachTeam(id, teamName) {
        this._teams.get(teamName)[players].set(teamName, id);
    }

    addTeam(teamName) {
        this._teams.set(teamName, new Team(teamName));
    }

    addTeam(teamName) {
        this.team[teamName] = new Team(teamName);
    }

    
}

function convertMapToObject(map) {
    let objToReturn = {};
    map.forEach(function(value, key) {
        objToReturn[key] = value;
    })
    return objToReturn;
}



class Player {
    constructor(name, id) {
        this.name = name;
        this.location = null;
        this.flagHeld = false;
        //this.team = null
        this.id = id;
        this.isTagged = false;
        this.leader = true;
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
    constructor(name) {
        this.name = name;
        this.players = {};
        this.flags = {};

    }
}

