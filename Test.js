const Game = require('./game_modules/game.js')
const gameError = require('./game_modules/GameFailureReason')

let testGame = new Game('test')

testGame.createBoundary({latitude: 345987435, longitude: 45359843}, 'vertical')

console.log(testGame.getBoundary())

