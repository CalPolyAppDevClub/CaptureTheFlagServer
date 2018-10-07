const Game = require('./game_modules/game.js')
const gameError = require('./game_modules/GameFailureReason')

let testGame = new Game('test')

testGame.createBoundary({latitude: 35.30855194031521, longitude: -120.65916015027311}, 'vertical')

testGame.addPlayer(123, 'Ethan')
testGame.addPlayer(345, 'Bob')
testGame.updateLocation(123, 35.30855194031521, -120.65916015027311)
testGame.updateLocation(345, 35.30855194031521, -120.65916015027311)

let teamId1 = testGame.addTeam('team1')
let teamId2 = testGame.addTeam('team2')

testGame.addToTeam(123, teamId1)
testGame.addToTeam(345, teamId2)



testGame.nextGameState()
let flagId = testGame.addFlag(345, {latitude: 35.30855194031521, longitude: -120.65916015027311})
console.log(testGame.getTeams())
console.log(flagId)
testGame.nextGameState()
console.log(testGame.pickUpFlag(flagId, 123))
console.log(testGame.getPlayerInfo(123))
testGame.updateLocation(123, 567809765, 4537983452)

