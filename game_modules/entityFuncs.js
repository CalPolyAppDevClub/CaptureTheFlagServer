const GeoLib = require('geolib')

let exporter = {}

let pickUpErrors = {
    
}

exporter.updateLocation = (entity, location) => {
    if (entity.location !== undefined) {
        entity.location = location
        emitEvent(entity, 'locationChanged', location)
        return true
    }
    return false
}

exporter.pickUp = (pickingUpEntity, item) => {
    if (pickingUpEntity.pickUpComponent.tagged) {
        console.log('tagged')
        return
    }

    if (pickingUpEntity.pickUpComponent.boundary && !exporter.isInBoundsGameEntity(pickingUpEntity, item)) {
        console.log('picking up entity is not in flag bounds')
        return
    } 

    if (item.boundary && !pickingUpEntity.pickUpComponent.boundary && !exporter.isInBoundsGameEntity(item, pickingUpEntity)) {
        console.log('flag is not in picking up entity bounds')
        return
    }

    if (item.held === true) {
        console.log('item is held')
        return
    }

    if (pickingUpEntity.pickUpComponent.maxHeld === pickingUpEntity.itemsHeld.size) {
        console.log('holding too many items')
        return
    }
    pickUp(pickingUpEntity, item)
}

function pickUp(pickingUpEntity, item) {
    pickingUpEntity.itemsHeld.add(item)
    item.held = true
    emitEvent(pickingUpEntity, 'pickedUp', item)
    emitEvent(item, 'held', pickingUpEntity)
}

exporter.dropItems = (entity, itemsToDrop) => {
    let droppedItems = []
    itemsToDrop.forEach((item) => {
        let deleted = entity.heldItems.delete(item)
        if (deleted) {
            item.holder = null
            exporter.updateLocation(item, entity.location)
            droppedItems.push(item)
            emitEvent(item, 'dropped')
        }
    })
    if (droppedItems.length > 0) {
        emitEvent(entity, 'droppedItems', droppedItems)
    }
    return droppedItems
}

exporter.untag = (entity) => {
    if (entity.tagged !== undefined) {
        entity.tagged = false
        emitEvent(entity, 'untagged')
    }
}

exporter.tag = (entityToTag, taggingEntity) => {
    if (taggingEntity.tagComponent.tagged) {
        return
    }

    if (entityToTag.tagged) {
        return
    }

    if (taggingEntity.tagComponent.boundary && !exporter.isInBoundsGameEntity(taggingEntity, entityToTag)) {
        return
    }

    if (entityToTag.boundary && !exporter.isInBoundsGameEntity(entityToTag, taggingEntity)) {
        return
    }
    tag(taggingEntity, entityToTag)
}

function tag(taggingEntity, entityToTag) {
    entityToTag.tagged = true
    emitEvent(entityToTag, 'wasTagged', taggingEntity)
    emitEvent(taggingEntity, 'tagged', entityToTag)
}

exporter.addEntityToTeam = (entity, team) => {
    console.log('team')
    console.log(team)
    if (team.entities !== undefined && entity.team === null) {
        console.log('should beeeeee innnnnn hereeeee')
        team.entities.add(entity)
        entity.team = team
        emitEvent(entity, 'joinedTeam', team)
        if (entity.name !== undefined) {
            emitEvent(team, 'playerAdded', entity)
        } else {
            emitEvent(team, 'flagAdded', entity)
        }
        //emitEvent(team, 'entityAdded', entity)
        return true
    }
    return false
}

exporter.getTeamOfSide = (gameBoundary, location) => {
    if (!exporter.isInBounds(gameBoundary, location)) {
        return null
    }
    if (gameBoundary.separatorDirection === 'vertical') {
        if (location.longitude < gameBoundary.location.longitude) {
            return gameBoundary.teamSides.lesser
        }
        if (location.longitude > gameBoundary.location.longitude) {
            return gameBoundary.teamSides.greater
        }
    } else if (gameBoundary.separatorDirection === 'horizontal') {
        if (location.latitude < gameBoundary.location.latitude) {
            return gameBoundary.teamSides.lesser
        }
        if (location.latitude > gameBoundary.location.latitude) {
            return gameBoundary.teamSides.greater
        }
    }
}

exporter.isInBounds = (gameBoundary, location) => {
    let distanceFromCenter = GeoLib.getDistance(gameBoundary.location, location)
    return distanceFromCenter <= gameBoundary.baseBoundary.radius
}

exporter.isInBoundsGameEntity = (boundEntity, checkEntity) => {
    let distanceFromCenter = GeoLib.getDistance(boundEntity.location, checkEntity.location)
    return distanceFromCenter <= boundEntity.boundary.radius
}

exporter.isOnCorrectSide = (gameBoundary, entity, team) => {
    if (gameBoundary.separatorDirection === 'vertical') {
        if (entity.location.longitude < gameBoundary.location.longitude) {
            if (team === undefined) {
                return gameBoundary.teamSides.lesser.entities.has(entity)
            } else {
                return gameBoundary.teamSides.lesser === team
            }
        }
        if (entity.location.longitude > gameBoundary.location.longitude) {
            if (team === undefined) {
                return gameBoundary.teamSides.greater.entities.has(entity)
            } else {
                return gameBoundary.teamSides.greater === team
            }
        }
    }
}

function emitEvent(entity, event, data) {
    console.log('from emit event')
    console.log(event)
    if (entity.eventEmitter) {
        console.log('An event emitter exists')
        if (data != null) {
            entity.eventEmitter.emit(event, data)
        } else {
            entity.eventEmitter.emit(event)
        }
    }
}

module.exports = exporter
