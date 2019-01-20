//const GameBoundary = require('./game_modules/GameBoundary')
const CircleBoundary = require('./game_modules/CircleBoundary')
const Player = require('./game_modules/Player')

let player = new Player('Bob', new CircleBoundary({latitude:345, longitude: 567}, 50000))
player.setLocation({latitude: 123, longitude: 456})
console.log(player.getLocation())
