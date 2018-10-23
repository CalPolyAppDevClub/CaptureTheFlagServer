/*const Game = require('./game_modules/game.js')
const gameError = require('./game_modules/GameFailureReason')

let testGame = new Game('test')

testGame.createBoundary({latitude: 35.30855194031521, longitude: -120.65916015027311}, 'vertical')

let player1 = testGame.createPlayer('Ethan')
let player2 = testGame.createPlayer('Bob')

testGame.addPlayer(player1)
testGame.addPlayer(player2)

let players = testGame.getPlayers()*/
let biMap = require('./biDirectional')

let twoWay = new biMap([['Sam', 'Larry']])

twoWay.set('fuck', 'shit')

console.log(twoWay)

twoWay.deleteWithKey('Sam')

console.log(twoWay)







