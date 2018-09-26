const Game = require('./game_modules/game.js')
const gameError = require('./game_modules/GameFailureReason')

let testGame = new Game('test')

testGame.addPlayer('1', 'Sam')
testGame.addPlayer('2', 'Bob')

let teamOneId = testGame.addTeam('red')
let teamTwoId = testGame.addTeam('blue')

testGame.addToTeam('1', teamOneId)
testGame.addToTeam('2', teamTwoId)

testGame.nextGameState()

testGame.updateLocation('1', '35.30861894276748', '-120.65915740973125')
testGame.updateLocation('2', '35.30861894276748', '-120.65915740973125')

let flag = testGame.addFlag('1', {latitude: '35.30861894276748', longitude: '-120.65915740973125'});

testGame.nextGameState()

let flagError = testGame.pickUpFlag(flag.id, '2')
console.log('flagError')
console.log(flagError)
console.log(testGame.getPlayers())
testGame.on('playerTagged', (taggedPlayerId, flagHeldLocation) => {
    console.log('playerTagged')
    console.log(taggedPlayerId)
    console.log(flagHeldLocation)
})
let error = testGame.tagPlayer('2', '1')
console.log('\n\n\n\n')
console.log(testGame.getPlayers())

console.log(error)

