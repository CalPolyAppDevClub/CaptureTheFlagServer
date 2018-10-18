const Game = require('./game_modules/game.js')
const gameError = require('./game_modules/GameFailureReason')

let testGame = new Game('test')

testGame.createBoundary({latitude: 35.30855194031521, longitude: -120.65916015027311}, 'vertical')

testGame.addPlayer(123, 'Ethan')
testGame.addPlayer(345, 'Bob')
testGame.updateLocation(123, 35.30855194031521, -120.65916015027311)
testGame.updateLocation(345, 35.30855194031521, -120.65916015027311)

let teamId1 = null
let teamId2 = null
testGame.on('teamAdded', (team) => {
    console.log('team added')
    console.log(team)
    if (teamId1 === null) {
        teamId1 = team.id
    } else {
        teamId2 = team.id
    }
})
testGame.addTeam('team1')
testGame.addTeam('team2')

testGame.addToTeam(123, teamId1)
testGame.addToTeam(345, teamId2)


testGame.nextGameState()

let flagId = null
testGame.on('flagAdded', (flag) => {
    console.log('flag being added')
    console.log(flag)
    flagId = flag.id
})

testGame.addFlag(345, {latitude: 35.30851, longitude: -120.65916015027311})

testGame.nextGameState()
testGame.pickUpFlag(flagId, 123)

console.log('GET PLAYER INDO')
console.log(testGame.getPlayerInfo(123))
console.log()
console.log()
console.log()
testGame.updateLocation(123, 40.7128, 74.0060)

console.log('before drop flag')
console.log(testGame.getPlayerInfo(123))

testGame.dropFlag(123)
console.log()
console.log()
console.log()
console.log()
console.log(testGame.getPlayerInfo(123))



