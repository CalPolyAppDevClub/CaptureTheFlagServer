module.exports = class MovementSystem {
    constructor(gameBoundary) {
        this.gameBoundary = gameBoundary
    }

    didMove(player, lastLocation) {
        if (!this.gameBoundary.isInBounds(player)) {
            console.log('Movement system is about to call drop flags')
            player.dropFlagsAtLocation(player.flags(), lastLocation)
        }

        if (this.gameBoundary.isOnCorrectSide(player) && player.isTagged) {
            player.untag()
        }
    }
}