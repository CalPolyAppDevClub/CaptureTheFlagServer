const GameError = require('./GameFailureReason')
function createStandardPlayer(name, boundary) {
    return {
        name : name,
        boundary : boundary,
        location : null,
        tagged : false,
        interaction : {
            tagged : false,
            boundary : boundary,
            location : location
        },
        pickingUp : {
            heldItems : new Set()
        }
    }
}

function pickUp(entity, itemPickingUp) {
    if (entity.pickingUp.tagged) {
        return GameError.playerTagged
    }
    if (entity.pickedUp.boundary) {
        if (!entity.pickingUp.boundary.isInBounds(itemPickingUp)) {
            return GameError.playersNotCloseEnough
        }
        entity.pickingUp.heldItems.add(itemPickingUp)
        itemPickingUp.pickingUp.
    } else if (itemPickingUp.boundary) {
        if (!itemPickingUp.boundary.isCloseEnough(entity)) {
            return GameError.playersNotCloseEnough
        }
        entity.p
    }
}

function addToTeam(player, team) {
    team.players.push(item)
    player.team = team
}