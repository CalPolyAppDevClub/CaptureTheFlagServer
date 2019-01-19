const GameError = require('./GameFailureReason')
module.exports = class PickUpSystem {
    constructor(gameBoundary) {
        this.lastError = null
        this.gameBoundary = gameBoundary
    }
    
    canPickUp(pickingUp, beingPickedUp) {
        if (gameBoundary.isOnCorrectSide(pickUp, pickingUp.getTeam())) {
            this.lastError
            return false
        }

        if (pickingUp.isTagged()) {
            this.lastError = GameError.playerTagged
            return false
        }
        if (!beingPickedUp.isCloseEnough(pickingUp)) {
            this.lastError = GameError.playersNotCloseEnough
            return false
        }

        if (beingPickedUp.isHeld()) {
            this.lastError
            return false
        }

        if (!beingPickedUp.isCloseEnough(pickingUp)) {
            this.lastError = GameError.playersNotCloseEnough
            return false
        }

        return true
    }
}