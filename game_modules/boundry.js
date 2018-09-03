module.exports = class Boundary {
    constructor(coords, diameter, direction) {
        if (coords['latitude'] == undefined || coords['longitude'] == undefined) {
            throw new TypeError('invalid coords')
        }
        this.coordinates = coords
        this.direction = direction
        this.diameter = diameter
    }

    

};