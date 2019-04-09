const GameError = require('./GameFailureReason')
module.exports = class PickUpSystem {
    constructor(gameBoundary) {
        this.lastError = null
        this.gameBoundary = gameBoundary
    }
    
    canPickUp(player, beingPickedUp) {
        if (!this.gameBoundary.isOnCorrectSide(player, beingPickedUp.getTeam())) {
            this.lastError = 'WRONG SIDE'
            return false
        }

        if (player.tagged()) {
            this.lastError = GameError.playerTagged
            return false
        }
        if (!beingPickedUp.isCloseEnough(player)) {
            this.lastError = GameError.playersNotCloseEnough
            return false
        }

        if (beingPickedUp.isHeld()) {
            this.lastError = "Is held"
            return false
        }

        if (player.getTeam() === beingPickedUp.getTeam()){
            this.lastError = GameError.cannotBeOnSameTeam
            return false
        }

        return true
    }
}