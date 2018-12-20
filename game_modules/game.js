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
        this._flags = new Set()
        this._teams = []
        this._teams.push(new Team('Red'))
        this._teams.push(new Team('Blue'))
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
        return new Set(this._players)
    } 

    dropFlag(player) {
        if (!player.hasFlag()) {
            return GameFailureReason.playerDoesNotHaveAFlag
        }
        let flag = player.flag()
        player.dropFlag()
        if (player.getTeam() !== flag.getTeam()) {
            let oppositeTeamFlags = flag.getTeam().getFlags()
            for (flag of oppositeTeamFlags) {
                if (this.boundary.isOnCorrectSide(flag)) {
                    return
                }
            }
            this.emit('gameOver', player.getTeam())
        }
    }

    getFlags() {
        return new Set(this._flags)
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

    createBoundary(boundaryLineCoords, direction) {
        if (this.boundary !== null) {
            return GameFailureReason.boundaryAlreadyExists
        }
        let sides = {
            greater: this._teams[0],
            lesser: this._teams[1]
        }
        this.boundary = new GameBoundary(new CircleBoundary(boundaryLineCoords, 4000), direction, sides)
        this.emit('boundaryCreated', this.boundary)
        this._players.forEach((player) => {
            let team = this.boundary.getTeamOfSide(player)
            if (team !== null) {
                team.addPlayer(player)
            }
        })
    }

    setTeamsOnLocation() {
        for (player in this._players) {
            let team = this.boundary.getTeamOfSide(player)
            team.addPlayer(player)
        }
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
            //player.leader = true
        }
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
        if (player.isTagged && this.boundary.isOnCorrectSide(player)) {
            player.isTagged = false
        }
        this.emit('locationUpdate', player)
    }

    tagPlayer(playerToTag, taggingPlayer) {
        if (this.gameState != this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (!this._players.has(playerToTag)) {
            return GameFailureReason.playerNotInGame
        }
        if (!this._players.has(taggingPlayer)) {
            return //playerNotInGame
        }
        let taggingError = playerToTag.tag(taggingPlayer)
        return taggingError
    }

    createFlag(location) {
        let flag = new Flag(new CircleBoundary(location, 40))
        return flag
    }

    addFlag(flag, team) {
        //checks
        if (this.gameState !== this.gameStates.placeFlags) {
            return GameFailureReason.incorrectGameState
        }
        /*if (!playerAdder.leader) {
            return GameFailureReason.playerDoesNotHavePermission
        }*/
        if (this.boundary === null || !this.boundary.isOnCorrectSide(flag, team)) {
            return GameFailureReason.playerNotInBounds
        }
        if (this.boundary === null || !this.boundary.isInBounds(flag)) {
            return GameFailureReason.playerNotInBounds
        }
        if (!this._teams.includes(team)) {
            return 'teamNotInGame'
        }

        //logic
        this._flags.add(flag);
        team.addFlag(flag)
        this.emit('flagAdded', flag, team)
    }

    pickUpFlag(flag, player) {
        console.log('calling PICK UP FLAG IN GAME')
        if (this.gameState !== this.gameStates.gameInProgress) {
            console.log('wrong game state')
            return GameFailureReason.incorrectGameState
        }
        if (flag.getTeam() === player.getTeam()) {
            console.log('both teams the same')
            return GameFailureReason.cannotPickUpFlag
        }
        
        //if (!flag.isCloseEnough(player)) {
            //console.log('not close enough')
            //return GameFailureReason.cannotPickUpFlag
        //}
        console.log('get through everything')
        player.pickUpFlag(flag)
        flag.held = true;
    }

    getTeams() {
        return Array.from(this._teams)
    }

    removePlayer(player) {
        this._players.delete(id);
        this.emit('playerRemoved', player)
    }

    addToTeam(player, team) {
        if (!this._teams.has(team)) {
            return /*team not in game */
        } 
        if (!this._players.has(player)) {
            return /*player not in game */
        }
        team.addPlayer(player)
        this.emit('playerJoinedTeam', player, team);
    }

    createTeam(teamName) {
        return new Team(teamName)
    }

    addTeam(team) {
        if (Object.keys(this._teams).length === 2) {
            return GameFailureReason.tooManyTeams
        }
        this._teams.add(team)
        this.emit('teamAdded', team);
    }


    nextGameState() {
        if (this.gameState !== this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
};

class Player extends Events.EventEmitter {
    constructor(name, boundary) {
        super()
        this.name = name;
        this.flagHeld = null;
        this.isTagged = false;
        this._acceptableDistance = boundary
        this._reachDistance
        this.team = null
    }

    getLocation() {
        return this._acceptableDistance.getCenter()
    }

    getTeam() {
        return this.team
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

    __setTeam(team) {
        this.team = team
    }

    __removeTeam() {
        if (this.team == null) {
            return false
        }
        this.team = null
        return true
    }

    tag(taggingPlayer) {
        if (this.isCloseEnough(taggingPlayer)) {
            this.isTagged = true
            this.emit('tagged', taggingPlayer)
            this.dropFlag()
        }
        
    }

    pickUpFlag(flag) {
        if (this.flagHeld !== null) {
            return 'alreadHasflag'
        }
        if (this.isTagged) {
            return 'player tagged'
        }
        this.flagHeld = flag
        this.emit('pickedUpFlag', flag)
    }

    dropFlag() {
        if (this.hasFlag()) {
            let flag = this.flagHeld
            flag.setLocation(this.getLocation())
            flag.held = false
            this.flagHeld = null
            this.emit('flagDropped', flag)
        }
    }

    untag() {
        this.isTagged = false
        this.emit('untagged')
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

    getTeam() {
        return this._team
    }

    isCloseEnough(entity) {
        return this.acceptableDistance.isInBounds(entity)
    }

    setLocation(location) {
        this.acceptableDistance.setCenter(location)
        this.emit('locationChanged', this.acceptableDistance.getCenter())
    }

    __setTeam(team) {
        this._team = team
    }

    __removeTeam(team) {
        if (this._team == null) {
            return false
        }
        this._team = null
        return true
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
        this._separatorDirection = separaterDirection
        this._teamSides  = teamSides //greater, lesser
    }

    isInBounds(entity) {
        return this._boundary.isInBounds(entity)
    }

    isOnCorrectSide(entity, team) {
        if (this._separatorDirection === 'vertical') {
            if (entity.getLocation().longitude < this._center.longitude) {
                if (team === undefined) {
                    return this._teamSides.lesser.containsEntity(entity)
                } else {
                    return this._teamSides.lesser === team
                }
            }
            if (entity.getLocation().longitude > this._center.longitude) {
                if (team === undefined) {
                    return this._teamSides.greater.containsEntity(entity)
                } else {
                    return this._teamSides.greater === team
                }
            }
        } else if (this._separatorDirection === 'horizontal') {
            if (entity.getLocation().latitude < this._center.latitude) {
                return this._teamSides.lesser.containsEntity(entity)
            }
            if (entity.getLocation().latitude > this._center.latitude) {
                return this._teamSides.greater.containsEntity(entity)
            }
        }
    } 

    getTeamOfSide(entity) {
        if (!this.isInBounds(entity)) {
            return null
        }
        if (this._separatorDirection === 'vertical') {
            if (entity.getLocation().longitude < this._center.longitude) {
                return this._teamSides.lesser
            }
            if (entity.getLocation().longitude > this._center.longitude) {
                return this._teamSides.greater
            }
        } else if (this._separatorDirection === 'horizontal') {
            if (entity.getLocation().latitude < this._center.latitude) {
                return this._teamSides.lesser
            }
            if (entity.getLocation().latitude > this._center.latitude) {
                return this._teamSides.greater
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

class Team extends Events.EventEmitter {
    constructor(name) {
        super()
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

    containsEntity(entity) {
        return this.players.has(entity) || this.flags.has(entity)
    }

    addPlayer(player) {
        this.players.add(player)
        player.__setTeam(this)
        this.emit('playerAdded', player)
    }

    removePlayer(player) {
        let deleted = this.players.delete(player)
        player.__removeTeam()
        if (deleted) {
            this.emit('playerRemoved', player)
        }
        return deleted
    }

    addFlag(flag) {
        this.flags.add(flag)
        flag.__setTeam(this)
        this.emit('flagAdded', flag)
    }

    removeFlag(flag) {
        let deleted = this.flags.delete(flag)
        flag.__removeTeam()
        if (deleted) {
            this.emit('flagRemoved', flag)
        }
        return deleted
    }

    getPlayers() {
        return Array.from(this.players)
    }

    getFlags() {
        return Array.from(this.flags)
    }
}
