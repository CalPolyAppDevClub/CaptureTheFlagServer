const WebSocket = require('ws');
const Events = require('events');
const Message = require('./message');
const Game = require('./game')
const geo = require('geolib')
const http = require('http');
const express = require('express');
let app = express();

const PORT = process.env.PORT || 8000;
console.log('LISTENING TO ' + PORT)

app.use(express.static(__dirname + "/"));

var server = http.createServer(app)
server.listen(PORT)

console.log("http server listening on %d", PORT)




var wss = new WebSocket.Server({server: server})
console.log("websocket server created")

function Client(ws) {
    this.ws = ws;
    this.game;
}
Client.prototype.send = function(message) {
    var messageToSend = JSON.stringify(message)
    this.ws.send(messageToSend);
}

let numberOfClients = 0;
let clients = {};

let games = {}; 

var possibleCommands = {
    'printClients': printClients,
    'createGame' : createGame,
    'joinGame' : joinGame,
    'printGames' : printGames,
    'printPlayers' : printPlayers,
    'updateLocation' : updateLocation,
    'tagPlayer' : tagPlayer,
    'getPlayerInfo' : getPlayerInfo
};

wss.on('connection', function connection(ws, req) {
    let name = 'ethan'
    //adds id to websocket connection for future identification.
    ws.id = numberOfClients;
    let client = new Client(ws);
    clients[numberOfClients] = client;
    numberOfClients++;
    ws.on('message', function incoming(message) {
        console.log(ws.id);
        console.log('received: %s', message);
        let jsonObject = JSON.parse(message);
        parseJson(jsonObject, ws.id);
  });
  console.log('Connected');
  console.log(clients);
});


function printClients() {
    console.log(clients)
}

function printGames() {
    console.log(games);
}

function printPlayers(id) {
    let game = clients[id].game;
    console.log(game.players);
}

function Player(name) {
    this.name = name;
    this.location;
}

function updateLocation(json, id) {
    let latitude = json.latitude;
    let longitude = json.longitude;
    let game = clients[id].game;
    if (game === undefined) {
        return
    }
    game.updateLocation(id, latitude, longitude)
    var players = game.players;
    for (key in players) {
        if (key != id) {
             clients[key].send(new Message('locationUpdate', {playerId : "" 
             + id, newLocation : latitude + ',' + longitude }));
        }
    }
}

function tagPlayer(json, id) {
    let playerToTag = json.playerToTagId
    console.log(playerToTag)
    if (checkUndifined(playerToTag)) {
        clients[id].send(new Message('playerTagAttempted', {}, 'invalid data'));
        return
    }
    if (clients[id].game === undefined) {
        return;
    }
    var playerTagged = clients[id].game.tagPlayer(playerToTag, id)
    if (playerTagged) {
        let players = clients[id].game.players;
        for (key in players) {
            if (key != id) {
                clients[key].send(new Message('playerTagAttempted', {playerId : '' + playerToTag}));
            }
        }
    } else {
        clients[id].send(new Message('playerTagAttempted', {}, 'not close enough to player to tag'));
    }
} 

function joinGame(json, id) {
    let gameKey = json.key;
    let playerName = json.playerName;
    if (checkUndifined(gameKey, playerName)) {
        clients[id].send(new Message('joinGameAttempted', {}, 'invalid data'));
        return;
    }
    if (!gameExists(gameKey)) {
        clients[id].send(new Message('joinGameAttempted', {}, 'invalid key'));
        return;
    }
    games[gameKey].addPlayer(id, playerName);
    clients[id].game = games[gameKey]
    clients[id].send(new Message('joinGameAttempted', {}))
}

function gameExists(key) {
    return games[key] != undefined;
}

function createGame(json, id) {
    let gameKey = json.key;
    let gameName = json.gameName;
    if (checkUndifined(gameKey, gameName)) {
        clients[id].send(new Message('createGameAttempted', {}, 'invalid data'));
        return;
    }
    var game = new Game(gameName);
    games[gameKey] = game;
    clients[id].send(new Message('createGameAttempted', {}))
}

function getPlayerInfo(json, id) {
    if (clients[id].game === undefined) {
        return;
    }
    let player = clients[id].game.players[id];
    let playerWithStringValues = {};
    for (key in Object.keys(player)) {
        playerWithStringValues[key] = '' + player.key;
    }
    clients[id].send(new Message('playerInfo', playerWithStringValues));
}


function parseJson(json, id) {
    let objectData = json.data;
    let functionToUse = possibleCommands[json.command];
    functionToUse(objectData, id);
}

function checkUndifined() {
    for (let i = 0; i<arguments.length; i++) {
        if (arguments[i] == undefined) {
            return true;
        }
    }
    return false;
}












