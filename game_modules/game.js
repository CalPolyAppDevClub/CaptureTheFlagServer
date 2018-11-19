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
        return Array.from(this._flags)
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
        let sides = {}
        let team1 = this._teams.add(new Team('Red'))
        let team2 = this._teams.add(new Team('Blue'))
        sides.greater = team1
        sides.lesser = team2
        this.boundary = new GameBoundary(new CircleBoundary(boundaryLineCoords, 4000), direction, sides)
        this.emit('boundaryCreated', this.boundary)
        this._players.forEach((player) => {
            console.log('player in createBoundary')
            console.log(player)
            team = this.boundary.getTeamOfSide(player)
            team.addPlayer(player)
        })
    }

    setTeamsOnLocation() {
        for (player in this._players) {
            team = this.boundary.getTeamOfSide(player)
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
        /*if (!this.boundary.isOnCorrectSide(flag)) {
            console.log("not placing on the correct side")
            return GameFailureReason.playerNotInBounds
        }*/
        if (this.boundary === null || !this.boundary.isInBounds(flag)) {
            return GameFailureReason.playerNotInBounds
        }
        if (!this._teams.has(team)) {
            return 'teamNotInGame'
        }

        //logic
        this._flags.add(flag);
        team.addFlag(flag)
        this.emit('flagAdded', flag, team)
    }

    pickUpFlag(flag, player) {
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (getTeamOf.call(this, 'flag', flag) === getTeamOf.call(this, 'player', player)) {
            return GameFailureReason.cannotPickUpFlag
        }
        
        if (!flag.isCloseEnough(player)) {
            return GameFailureReason.cannotPickUpFlag
        }
        player.pickUpFlag(flag)
        flag.held = true;
        this.emit('flagPickedUp', flag, player)
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

function getTeamOf(type, item) {
    switch (type) {
        case 'player':
            let playerTeam
            this._teams.forEach((team, team1) => {
                if (team.containsPlayer(item)) {
                    console.log('team fro get team of for player')
                    console.log(team)
                    playerTeam = team
                }
            })
            return playerTeam
        case 'flag':
            let flagTeam
            this._teams.forEach((team, team1) => {
                if (team.containsFlag(item)) {
                    console.log('teams from get tram for flag')
                    console.log(team)
                    flagTeam = team
                }
            })
            return flagTeam
        default:
            console.log('is this going to return null')
            return null
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
            if (this.hasFlag()) {
                this.flagHeld.setLocation(this.getLocation())
                this.flagHeld.held = null
                this.dropFlag()
            }
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
        let flag = this.flagHeld
        this.flagHeld = null
        this.emit('flagDropped', flag)
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

    isCloseEnough(entity) {
        return this.acceptableDistance.isInBounds(entity)
    }

    setLocation(location) {
        this.acceptableDistance.setCenter(location)
        this.emit('locationChanged', this.acceptableDistance.getCenter())
    }

    __setTeam(team) {
        this.team = team
    }

    __removeTeam(team) {
        if (this.team == null) {
            return false
        }
        this.team = null
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

    getTeamOfSide(entity) {
        if (this._separatorDirection === 'vertical') {
            if (entity.location.longitude < this._center.longitude) {
                return this._teamSides.lesser
            }
            if (entity.location.longitude > this._center.longitude) {
                return this._teamSides.greater
            }
        } else if (this._separatorDirection === 'horizontal') {
            if (entity.location.latitude < this._center.latitude) {
                return this._teamSides.lesser
            }
            if (entity.location.latitude > this._center.latitude) {
                return this._teamSides.lesser
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
        console.log('from boundary get sides')
        console.log(this._teamSides)
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
