const Events = require('events');
const GameFailureReason = require('./GameFailureReason');
const GameBoundary = require('./GameBoundary')
const CircleBoundary = require('./CircleBoundary')
const Player = require('./Player')
const Team = require('./Team')
const Flag = require('./Flag')
const EntityFuncs = require('./entityFuncs')

const MAX_PLAYERS_PER_TEAM = 15;
const DISTANCE_BETWEEN_PLAYERS = 10000000;
module.exports = class Game extends Events.EventEmitter {
    constructor(name) {
        super();
        this._players = new Set()
        this._flags = new Set()
        this._teams = []
        this._teams.push(Team.createTeam('red'))
        this._teams.push(Team.createTeam('blue'))
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

    dropFlags(player, flags) {
        let droppedFlags = EntityFuncs.dropItems(player, flags)
        let playerTeam = player.team
        for (flag in droppedFlags) {
            if (playerTeam !== flag.team) {
                let allWrong = this._checkIfAllFlagsOnWrongSide(flag.getTeam)
                if (allWrong) {
                    this.emit('gameOver', playerTeam)
                }
            }
        }
    }

    dropAllFlags(player) {
        let flags = player.itemsHeld
        let droppedFlags = EntityFuncs.dropItems(player, flags)
        let playerTeam = player.team
        for (flag in droppedFlags) {
            if (playerTeam !== flag.team) {
                let allWrong = this._checkIfAllFlagsOnWrongSide(flag.getTeam())
                if (allWrong) {
                    this.emit('gameOver', playerTeam)
                }
            }
        }
    }

    _checkIfAllFlagsOnWrongSide(team) {
        let flags = team.getFlags()
        for (flag in flags) {
            if (this.boundary.isOnCorrectSide(flag)) {
                return false
            }
        }
        return true
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
        this.boundary = GameBoundary.createGameBoundary(CircleBoundary.createCircleBoundary(4000), direction, sides, boundaryLineCoords)

        this.emit('boundaryCreated', this.boundary)
        this._players.forEach((player) => {
            let team = EntityFuncs.getTeamOfSide(this.boundary, player.location)
            if (team !== null) {
                EntityFuncs.addEntityToTeam(player, team)
            }
        })
    }

    getBoundary() {
        if (this.boundary != undefined) {
            return this.boundary
        }
        return null
    }

    createPlayer(name) {
        let player = Player.createPlayer(name, CircleBoundary.createCircleBoundary(DISTANCE_BETWEEN_PLAYERS))
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
        EntityFuncs.updateLocation(player, location)
        if (this.boundary != null && !this.boundary.isInBounds(player) && player.flagHeld != null) {
            let flags = player.itemsHeld
            EntityFuncs.dropItems(player, flags)
        }
        if (player.isTagged && this.boundary.isOnCorrectSide(player)) {
            EntityFuncs.untag(player)
        }
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
        if (this.playerToTag.getTeam === taggingPlayer.getTeam) {
            return //players on same team error
        }

        EntityFuncs.tag(playerToTag, taggingPlayer)
    }

    createFlag(location) {
        let flag = Flag.createStandardFlag(CircleBoundary.createCircleBoundary(40), location)
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

        if (this.boundary === null || !EntityFuncs.isOnCorrectSide(this.boundary, flag, team)) {
            console.log('first not in bounds')
            return GameFailureReason.playerNotInBounds
        }

        if (this.boundary === null || !EntityFuncs.isInBounds(this.boundary, flag.location)) {
            console.log('not in bounds')
            return GameFailureReason.playerNotInBounds
        }

        if (!this._teams.includes(team)) {
            return 'teamNotInGame'
        }

        //logic
        this._flags.add(flag);
        EntityFuncs.addEntityToTeam(flag, team)
        this.emit('flagAdded', flag, team)
    }

    pickUpFlag(flag, player) {
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        if (flag.getTeam() === player.getTeam()) {
            return GameFailureReason.cannotPickUpFlag
        }
        if (player.hasFlag()) {
            return
        }
        if (player.isTagged()) {
            return
        }
        EntityFuncs.pickUp(player, flag)
        //TODO: check and send error from EntityFuns.pickUp
    }

    getTeams() {
        return Array.from(this._teams)
    }

    removePlayer(player) {
        let items = player.itemsHeld
        EntityFuncs.dropItems(player, items)
        this._players.delete(player);
        this.emit('playerRemoved', player)
    }

    addToTeam(player, team) {
        if (!this._teams.has(team)) {
            return /*team not in game */
        } 
        if (!this._players.has(player)) {
            return /*player not in game */
        }
        let added = EntityFuncs.addEntityToTeam(player, team)
        //TODO: handle added if false
    }

    nextGameState() {
        if (this.gameState !== this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
}
