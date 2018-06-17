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
        if (this._players.size == 0) {player.leader = true}
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
            console.log('PLAYER TO TAG ID: ' + playerToTagId)
            console.log(playerToTagId + ", " + idOfTaggingPlayer)
            let distanceBetweenPlayers = geoLib.getDistance(this._players.get(parseInt(playerToTagId)).location, 
                this._players.get(idOfTaggingPlayer).location);
            if (distanceBetweenPlayers <= 40) {
                this._players.get(parseInt(playerToTagId)).isTagged = true;
                this.emit('playerTagged', playerToTagId)
                return true
            } else {
                return false;
            }
        } else {
            throw new Error('InvalidStateError');
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
        this.emit('playerRemoved', id)
    }

    joinTeam(id, teamId) {
        console.log('ID TYPE: ' + typeof id + ' teamIdType: ' + typeof teamId)
        this._teams[teamId].players.push(id)
        this.emit('playerJoinedTeam', id, teamId);
    }

    addTeam(teamName) {
        let teamId = (Object.keys(this._teams).length + 1);
        let teamToAdd = new Team(teamName, teamId);
       // if (this._teams[teamId] > 2) {
            //return false;
        //}
        console.log('THIS IS THE TYPE WHILE ADDING TEAM: ' + typeof teamId)
        this._teams[teamId] = teamToAdd;
        console.log('FROM ADDING TEAM!!!! ' + teamId)
        this.emit('teamAdded', teamToAdd);
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

