

module.exports.createGameBoundary = (boundary, separaterDirection, teamSides, location) => {
    let gameBoundary = {
        baseBoundary : boundary,
        separatorDirection : separaterDirection,
        teamSides : teamSides,
        location : location
    }
    return gameBoundary
}


/*module.exports = class GameBoundary {
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
} */