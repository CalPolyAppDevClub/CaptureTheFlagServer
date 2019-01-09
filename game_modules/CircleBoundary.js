const geoLib = require('geolib')


module.exports.createCircleBoundary = (radius) => {
    let boundary = {
        type : 'circle',
        radius : radius
    }
    return boundary
}

/*module.exports = class CircleBoundary {
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
}*/