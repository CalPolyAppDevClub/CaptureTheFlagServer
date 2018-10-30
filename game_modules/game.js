const geoLib = require('geolib');
const clone = require('clone');
const Events = require('events');
const GameFailureReason = require('./GameFailureReason');
const Boundry = require('./boundry')
const uuid = require('uuid/v4')

const MAX_PLAYERS_PER_TEAM = 15;
const DISTANCE_BETWEEN_PLAYERS = 10000000;
module.exports = class Game extends Events.EventEmitter {
    constructor(name) {
        super();
        this._players = new Set()
        this._flags = new Set();
        this._teams = new Set();
        this.name = name;
        this.boundary = null;
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

    getPlayers() {
        return Array.from(this._players)
    }

    dropFlag(player) {
        if (!player.hasFlag()) {
            return GameFailureReason.playerDoesNotHaveAFlag
        }
        let flag = player.flag
        let location = player.getLocation()
        flag.setLocation(location)
        flag.held = false
        player.flag = null
        this.emit('flagDropped', player, flag)
    }

    getFlags() {
        let flagEntries = this._flags.entries()
        return flagEntries
    }

    checkIfAlreadyInGame(player) {
        return this._players.has(player)
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
        return playerNameTaken !== false;

    }

    checkIfTeamExists(team) {
        return this._teams.has(team)
        
    }

    createBoundary(boundaryLineCoords, direction){
        if (this.boundary !== null) {
            return GameFailureReason.boundaryAlreadyExists
        }
        this.boundary = new GameBoundary(new CircleBoundary(boundaryLineCoords, 4000), direction, {greater: this._teams[1], lesser: this._teams[2]})
        this.emit('boundaryCreated', createRepGameBoundary(this.boundary))
    }

    getBoundary() {
        if (this.boundary != undefined) {
            return this.boundary
        }
        return null
    }

    createPlayer(name) {
        let player = new Player(name, new CircleBoundary(null, DISTANCE_BETWEEN_PLAYERS))
        if (this._players.size === 0) {
            player.leader = true
        }
        this.addPlayer(player)
        return player
    }
        
    addPlayer(player) {
        if (this._players.has(player)) {
            return GameFailureReason.PlayerAlreadyInGame;
        }
        if (this._players.size === MAX_PLAYERS_PER_TEAM) {
            return GameFailureReason.TooManyPlayers;
        }
        if (this.checkIfAlreadyInGame(player)) {
            return GameFailureReason.NameAlreadyTaken
        }
        this._players.add(player);
        this.emit('playerAdded', player)
    }

    updateLocation(player, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        };
        let lastLocation = player.getLocation()
        player.setLocation(location)
        if (this.boundary != null && !this.boundary.isInBounds(player) && player.flagHeld != null) {
            let flag = player.flag()
            player.flagHeld = null
            flag.setLocation(lastLocation)
            this.emit('flagDropped', player, flag)
        }
        this.emit('locationUpdate', player)
    }

    tagPlayer(playerToTag, taggingPlayer) {
        if (this.gameState != this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (taggingPlayer.isCloseEnough(playerToTag)) {
            playerToTag.tag()
            let flagHeldLocation = null
            if (playerToTag.flagHeld != null) {
                let flag = playerToTag.flag()
                flagHeldLocation = playerToTag.getLocation()
                flag.setLocation(flagHeldLocation)
                this.emit('flagDropped', playerToTag, player)
            }
            this.emit('playerTagged', playerToTag, taggingPlayer)
        } else {
            return GameFailureReason.playersNotCloseEnough
        }
    }

    createFlag(location) {
        let flag = new Flag(new CircleBoundary(location, 40))
        return flag
    }

    addFlag(flag, playerAdder) {
        //checks
        if (this.gameState !== this.gameStates.placeFlags) {
            return GameFailureReason.incorrectGameState
        }
        if (!playerAdder.leader) {
            return GameFailureReason.playerDoesNotHavePermission
        }
        /*if (!this.boundary.isOnCorrectSide(flag)) {
            console.log("not placing on the correct side")
            return GameFailureReason.playerNotInBounds
        }*/
        if (this.boundary === null || !this.boundary.isInBounds(flag)) {
            return GameFailureReason.playerNotInBounds
        }

        //logic
        this._flags.add(flag);
        let team;
        if (this._teams.get(1).containsPlayer(playerAdder)) {
            team = this._teams.get(1)
            this._teams.get(1).addFlag(flag)
        } else {
            team = this._teams.get(2)
            this._teams.get(2).addFlag(flag)
        }
        this.emit('flagAdded', flag, team)
    }

    pickUpFlag(flag, player) {
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (getTeamOf.call(this, 'flag', flagId) === getTeamOf.call(this, 'player', playerId)) {
            return GameFailureReason.cannotPickUpFlag
        }
        
        if (!flag.isCloseEnough(player)) {
            return GameFailureReason.cannotPickUpFlag
        }
        player.flagHeld = flag
        flag.held = true;
        this.emit('flagPickedUp', flag, player)
    }

    getTeams() {
        let teamsIterator = this._teams.entries()
        return teamsIterator
    }

    removePlayer(player) {
        this._players.delete(id);
        this.emit('playerRemoved', player)
    }

    addToTeam(player, team) {
        this._teams.get(team.id).addPlayer(player);
        this.emit('playerJoinedTeam', player, team);
    }

    createTeam(teamName) {
        let teamId = (Object.keys(this._teams).length + 1)
        return new Team(teamName, teamId)
    }

    addTeam(team) {
        if (Object.keys(this._teams).length === 2) {
            return GameFailureReason.tooManyTeams
        }
        this._teams.add(team)
        this.emit('teamAdded', teamToAdd);
    }


    nextGameState() {
        if (this.gameState !== this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
};

function getTeamOf(type, item) {
    switch (type) {
        case 'player':
            if (this._teams.get(1).containsPlayer(item)) {
                return this._teams.get(1)
            }
            if (this._teams.get(2).containsPlayer(item)) {
                return this._teams.get(2)
            }
            break
        case 'flag':
            if (this._teams.get(1).containsFlag(item)) {
                return this._teams.get(1)
            }
            if (this._teams.get(2).containsFlag(item)) {
                return this._teams.get(2)
            }
            break
        default:
            break
    }
}

class Player extends Events.EventEmitter {
    constructor(name, boundary) {
        super()
        this.name = name;
        this.flagHeld = null;
        this.isTagged = false;
        this.leader = false;
        this._acceptableDistance = boundary
        this._reachDistance
    }

    getLocation() {
        return this._acceptableDistance.getCenter()
    }

    isCloseEnough(entity) {
        return this._acceptableDistance.isInBounds(entity)
    }

    setLocation(location) {
        this._acceptableDistance.setCenter(location)
        this.emit('locationChanged', this._acceptableDistance.getCenter())
    }

    hasFlag() {
        return this.flagHeld != null
    }

    flag() {
        return this.flagHeld
    }

    tag() {
        this.isTagged = true
        this.emit('tagged')
    }

    dropFlag() {
        this.emit('flagDropped', this.flagHeld)
    }

    
}

class Flag extends Events.EventEmitter  {
    constructor(boundary, location) {
        super()
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
        this.emit('locationChanged', this.acceptableDistance.getCenter())
    }

    setHeld() {
        this.held = true
        this.emit('held')
    }

    setDropped() {
        this.held = false
        this.emit('dropped')
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
        if (entity.getLocation() != null) {
            let distanceFromCenter = geoLib.getDistance(this._centerPoint, entity.getLocation())
            return distanceFromCenter <= this._radius
        }
        return false
    }

    setCenter(location) {
        this._centerPoint = location
    }
}


class GameBoundary {
    //teamSides = [lesser: team, greater: team]
    constructor(boundary, separaterDirection, teamSides) {
        this._boundary = boundary
        this._center = boundary.getCenter()
        this._separaterDirection = separaterDirection
        this._teamSides  = teamSides
    }

    isInBounds(entity) {
        return this._boundary.isInBounds(entity)
    }

    isOnCorrectSide(entity) {
        //figure out what side entity is on
        if (this._separaterDirection === 'veritcal') {
            if (entity.location.longitude < this._center.longitude) {
                return this.teamsSides.lesser.containsEntity(entity)
            }
            if (entity.location.longitude > this._center.longitude) {
                return this.teamsSides.greater.constainsEntity(entity)
            }
        } else if (this._separaterDirection === 'horizontal') {
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

    getDirection() {
        return this._separatorDirection
    }

    getSides() {
        return this._teamSides
    }
}

class Team {
    constructor(name, id) {
        this.id = id;
        this.name = name;
        this.players = new Set();
        this.flags = new Set();
    }
    containsPlayer(player) {
        return this.players.has(player)
    }
    containsFlag(flag) {
        return this.flags.has(flag)
    }

    addPlayer(player) {
        this.players.add(player)
    }

    addFlag(flag) {
        this.flags.add(flag)
    }

    getPlayers() {
        return new Array.from(this.players)
    }

    getFlags() {
        return new Array.from(this.flags)
    }
}
