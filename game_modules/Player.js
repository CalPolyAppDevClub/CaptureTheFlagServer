const Events = require('events')
module.exports = class Player extends Events.EventEmitter {
    constructor(name, boundary, movementSystem, taggingSystem, pickUpSystem) {
        super()
        this.name = name;
        this._flagsHeld = new Set()
        this.isTagged = false;
        this._acceptableDistance = boundary
        this._reachDistance
        this.team = null
        this.taggingSystem = taggingSystem
        this.pickUpSystem = pickUpSystem
        this.movementSystem = movementSystem
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
        let lastLocation = this.getLocation()
        this._acceptableDistance.setCenter(location)
        this.emit('locationChanged', this._acceptableDistance.getCenter())
        if (this.movementSystem) {
            this.movementSystem.didMove(this, lastLocation)
        }
    }

    hasFlags() {
        return this._flagsHeld.size > 0
    }

    flags() {
        return Array.from(this._flagsHeld)
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

    pickUpFlag(flag) {
        if (!this.pickUpSystem) {
            return
        }
        if (this.pickUpSystem.canPickUp(this, flag)) {
            this._flagsHeld.add(flag)
            flag.setHeld()
            this.emit('pickedUpFlag', flag)
            return
        }
        return this.pickUpSystem.lastError
    }

    dropFlags(flags) {
        let droppedFlags = []
        flags.forEach((flag) => {
            let deleted = this._flagsHeld.delete(flag)
            if (deleted) {
                droppedFlags.push(flag)
                flag.setDropped(this.getLocation())
            }
        })
        if (droppedFlags.length > 0) {
            this.emit('droppedFlags', droppedFlags)
        }
        return droppedFlags
    }

    dropFlagsAtLocation(flags, location) {
        let droppedFlags = []
        flags.forEach((flag) => {
            let deleted = this._flagsHeld.delete(flag)
            if (deleted) {
                droppedFlags.push(flag)
                flag.setDropped(location)
            }
        })
        if (droppedFlags.length > 0) {
            this.emit('droppedFlags', droppedFlags)
        }
        return droppedFlags
    }

    dropAllFlags() {
        let droppedFlags = Array.from(this._flagsHeld)
        droppedFlags.forEach((flag) => {
            flag.setDropped(this.getLocation())
        })
        this._flagsHeld.clear()
        if (droppedFlags.length > 0) {
            this.emit('droppedFlags', droppedFlags)
        }
        return droppedFlags
    }

    tag(player) {
        if (!this.taggingSystem) {
            return
        }
        if (this.taggingSystem.canTag(this, player)) {
            player.setTagged()
            this.emit('tagged', player)
            return
        }
        return this.taggingSystem.lastError
    }

    setTagged() {
        this.isTagged = true
        this.dropAllFlags()
        this.emit('hasBeenTagged')
    }

    canBeTaggedBy(player) {
        return this.isCloseEnough(player)
    }

    untag() {
        this.isTagged = false
        this.emit('untagged')
    }

    hasFlag() {
        return this._flagsHeld.size > 0
    }

    tagged() {
        return this.isTagged
    }
    
}

