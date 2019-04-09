const Events = require('events')
const GameFailureReason = require('./GameFailureReason')
const GameBoundary = require('./GameBoundary')
const CircleBoundary = require('./CircleBoundary')
const Player = require('./Player')
const Team = require('./Team')
const Flag = require('./Flag')
const TaggingSystem = require('./taggingSystem')
const PickUpSystem = require('./PickUpSystem')
const MovementSystem = require('./movementSystem')

const MAX_PLAYERS_PER_TEAM = 15;
const DISTANCE_BETWEEN_PLAYERS = 10000000;
module.exports = class Game extends Events.EventEmitter {
    constructor(name) {
        super();
        this._players = new Set()
        this._flags = new Set()
        this._teams = []
        this._teams.push(new Team('red'))
        this._teams.push(new Team('blue'))
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
        let droppedFlags = player.dropFlags(flags)
        let playerTeam = player.getTeam()
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
        let droppedFlags = player.dropAllFlags()
        let playerTeam = player.getTeam()
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
        this.boundary = new GameBoundary(new CircleBoundary(boundaryLineCoords, 4000), direction, sides)
        this.emit('boundaryCreated', this.boundary)
        this._players.forEach((player) => {
            let taggingSystem = new TaggingSystem(this.boundary)
            let pickUpSystem = new PickUpSystem(this.boundary)
            let movementSystem = new MovementSystem(this.boundary)
            player.taggingSystem = taggingSystem
            player.pickUpSystem = pickUpSystem
            player.movementSystem = movementSystem
            let team = this.boundary.getTeamOfSide(player)
            if (team) {
                team.addPlayer(player)
            }
        })
    }

    getBoundary() {
        if (this.boundary) {
            return this.boundary
        }
        return null
    }

    createPlayer(name) {
        let circleBoundary = new CircleBoundary(null, DISTANCE_BETWEEN_PLAYERS)
        let player = new Player(name, circleBoundary)
        player.on('droppedFlags', (flags) => {
            if(this._checkIfAllFlagsOnWrongSide(player.team)) {
                this.emit('gameOver', player.getTeam())
            }
        })
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
        player.setLocation(location)
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
        return taggingPlayer.tag(playerToTag)
    }

    createFlag(location) {
        let flag = new Flag(new CircleBoundary(location, DISTANCE_BETWEEN_PLAYERS))
        return flag
    }

    addFlag(flag, team) {
        if (this.gameState !== this.gameStates.placeFlags) {
            return GameFailureReason.incorrectGameState
        }
        
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
        this.emit('flagAdded', flag)
    }

    pickUpFlag(flag, player) {
        if (this.gameState !== this.gameStates.gameInProgress) {
            return GameFailureReason.incorrectGameState
        }
        return player.pickUpFlag(flag)
        //TODO: check and send error from EntityFuns.pickUp
    }

    getTeams() {
        return Array.from(this._teams)
    }

    removePlayer(player) {
        player.dropAllFlags()
        this._players.delete(player);
        this.emit('playerRemoved', player)
    }

    addToTeam(player, team) {
        if (!this._teams.has(team)) {
            console.log('GAME DOES NOT HAVE TEAM')
            console.log(team)
            return /*team not in game */
        } 
        if (!this._players.has(player)) {
            console.log('GAME DOES NOT HAVE PLAYER')
            return /*player not in game */
        }
        team.addPlayer(player)
        //TODO: handle added if false
    }

    nextGameState() {
        if (this.gameState !== this.gameStates.gameEnd) {
            this.gameState++;
            this.emit('gameStateChanged', this.gameState);
        }
    }
}
