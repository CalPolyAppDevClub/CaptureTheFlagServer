const geoLib = require('geolib');
const clone = require('clone');
const Events = require('events');
const GameFailureReason = require('./GameFailureReason');
const Boundry = require('./boundry')

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
        let playerEntries = this._players.entries()
        console.log('player entries')
        console.log(playerEntries)
        let repPlayers = {}
        for (let player of playerEntries) {
            let playerProperties = player[1]
            let repPlayer = createRepPlayer(playerProperties)
            repPlayers[repPlayer.id] = repPlayer
        }
        console.log('getting players')
        console.log(repPlayers)
        return repPlayers
    }

    getFlags() {
        let flagEntries = this._flags.entries()
        let repFlags = {}
        for (flag in flagEntries) {
            let flagProperties = flag[1]
            let repFlag = createRepFlag(flagProperties)
            repFlags[repFlag.id] = repPlayer
        }
        return repFlags
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

    createBoundry(boundryLineCoords, direction){
        this.boundry = new Boundry(boundryLineCoords, direction)
    }

    getBoundary() {
        return this.boundry
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

        let player = new Player(playerName, '' + id, new CircleBoundary(null, 40))
        if (this._players.size === 0) {
            player.leader = true
        }
        this._players.set(id, player);
        let repPlayer
        this.emit('playerAdded', player)
    }

    updateLocation(id, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        };
        this._players.get(id).setLocation(location)
        this.emit('locationUpdate', id, location)
    }

    tagPlayer(playerToTagId, idOfTaggingPlayer) {
        if (this.gameState != this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        let playerToTag = this._players.get(playerToTagId)
        let taggingPlayer = this._players.get(idOfTaggingPlayer)
        if (taggingPlayer.isCloseEnough(playerToTag)) {
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
        let flagId = this._flags.size + 1;

        let flag = new Flag('' + flagId, new CircleBoundary(location, 40))

        this._flags.set('' + flagId, flag);
        let teamId;
        if (this._teams[1].containsPlayer(idOfAdder.toString())) {
            teamId = this._teams[1].id
            this._teams[teamId].flags.push(flagId.toString())
        } else {
            teamId = this._teams[2].id
            this._teams[teamId].flags.push(flagId.toString())
        }
        let flagToSend = createRepFlag(flag)
        this.emit('flagAdded', flagToSend, teamId)
    }

    pickUpFlag(flagId, playerId) {
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (getTeamOf.call(this, 'flag', flagId) === getTeamOf.call(this, 'player', playerId)) {
            return GameFailureReason.cannotPickUpFlag
        }
        let flag = this._flags.get(flagId)
        let player = this._players.get(playerId)
        if (!flag.isCloseEnough(player)) {
            return GameFailureReason.cannotPickUpFlag
        }
        this._players.get(playerId).flagHeld = flagId
        this._flags.get(flagId).held = true;
        this.emit('flagPickedUp', flagId, playerId)
    }

    getTeams() {
        return clone(this._teams)
    }

    removePlayer(id) {
        this._players.delete(id);
        this.emit('playerRemoved', String(id))
    }

    addToTeam(id, teamId) {
        this._teams[teamId].players.push('' + id);
        this.emit('playerJoinedTeam', String(id), teamId);
    }

    addTeam(teamName) {
        if (Object.keys(this._teams).length === 2) {
            return GameFailureReason.tooManyTeams
        }
        let teamId = (Object.keys(this._teams).length + 1);
        let teamToAdd = new Team(teamName, teamId);
        this._teams[teamId] = teamToAdd;
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

function createRepPlayer(player) {
    return {
        name : player.name,
        id : player.id,
        flagHeld : player.flagHeld,
        location : player.getLocation(),
        leader : player.leader,
        isTagged : player.isTagged
    }
}

function createRepFlag(flag) {
    return {
        name : flag.name,
        id : flag.id,
        location : flag.getLocation(),
        held : flag.held
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
    constructor(name, id, boundary) {
        this.name = name;
        this.flagHeld = null;
        this.id = id;
        this.isTagged = false;
        this.leader = true;
        this._acceptableDistance = boundary
    }

    getLocation() {
        return this._acceptableDistance.getCenter()
    }

    isCloseEnough(entity) {
        return this._acceptableDistance.isInBounds(entity)
    }

    setLocation(location) {
        this._acceptableDistance.setCenter(location)
    }
}

class Flag  {
    constructor(id, boundary) {
        this.id = id;
        this.acceptableDistance = boundary;
        this.held = false;
    }
    
    getLocation() {
        return this.acceptableDistance.getCenter()
    }

    isCloseEnough(entity) {
        return this.acceptableDistance.isInBounds(entity)
    }

    setLocation(location) {
        this.acceptableDistance.setCenter(location)
    }
}

class CircleBoundary {
    constructor(centerPoint, radius) {
        this._centerPoint = centerPoint
        this._radius = radius
        this.boundaryType = 'circle'
    }

    getCenter() {
        return this._centerPoint
    }

    isInBounds(entity) {
        let distanceFromCenter = geoLib.getDistance(this._centerPoint, entity.location)
        return distanceFromCenter <= this._radius
    }

    setCenter(location) {
        this._centerPoint = location
    }
}


class GameBoundary {
    //teamSides = [left: team, right: team]
    constructor(boundary, separaterDirection, teamSides) {
        this._boundary = boundary
        this._center = boundary.getCenter()
        this._separatorDirection = separaterDirection
        this._teamSides  = teamSides
    }

    isInBounds(entity) {
        return this._boundary.isInBounds(entity)
    }

    isOnCorrectSide(entity) {
        //figure out what side entity is on
        if (separaterDirection === 'veritcal') {
            if (entity.location.longitude < this._center.longitude) {
                return this.teamsSides.lesser.containsEntity(entity)
            }
            if (entity.location.longitude > this._center.longitude) {
                return this.teamsSides.greater.constainsEntity(entity)
            }
        } else if (separaterDirection === 'horizontal') {
            if (entity.location.latitude < this._center.latitude) {
                return this.teamSides.lesser.containsEntity(entity)
            }
            if (entity.location.latitude > this._center.latitude) {
                return this.teamSides.greater.constainsEntity(entity)
            }
        }
    }

    getCenter() {
        return this._center
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
