const Events = require('events')

/*module.exports.createTeam = (name) => {
    let team = {
        eventEmitter : new Events.EventEmitter(),
        name : name,
        entities : new Set()
    }
    return team
}*/


module.exports = class Team extends Events.EventEmitter {
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
        console.log('team add player IS BEING CALLED')
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
