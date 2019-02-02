const GameError = require('./GameFailureReason')
module.exports = class PickUpSystem {
    constructor(gameBoundary) {
        this.lastError = null
        this.gameBoundary = gameBoundary
    }
    
    canPickUp(pickingUp, beingPickedUp) {
        if (this.gameBoundary.isOnCorrectSide(pickingUp, pickingUp.getTeam())) {
            this.lastError = 'WRONG SIDE'
            return false
        }

        if (pickingUp.tagged()) {
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