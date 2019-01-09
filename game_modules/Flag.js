const Events = require('events')

module.exports.createStandardFlag = (boundary, location) => {
    let flag = {
        eventEmitter : new Events.EventEmitter(),
        boundary : boundary,
        team : null,
        held : false,
        location : location
    }
    return flag
}





/*module.exports = class Flag extends Events.EventEmitter  {
    constructor(boundary) {
        super()
        this.acceptableDistance = boundary;
        this._holdingEntities = new Set()
        this._held = false
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

    __removeTeam() {
        if (this._team == null) {
            return false
        }
        this._team = null
        return true
    }

    setDropped(location) {
        this.held = false
        this.setLocation(location)
        this.emit('dropped', location)
    }

    setHeld() {
        this._held = true
        this.emit('held')
    }

    isHeld() {
        return this._held
    }

    canBePickedUpBy(entity) {
        return this.isCloseEnough(entity)
    }
}*/