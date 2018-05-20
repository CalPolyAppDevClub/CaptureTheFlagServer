const WebSocket = require('ws');
const Events = require('events');
const Message = require('./message');
const Game = require('./game')
const geo = require('geolib')
const http = require('http');
const express = require('express');
const fclone = require('fclone');
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
let clients = new Map();
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

wss.options.verifyClient = function(info, callback) {
    console.log(fclone(info.req.headers.authorization))
    if (info.req.headers.authorization === 'AUTH-TOKEN') {
        callback(true)
    } else {
        callback(false, 1, 'incorrect token')
    }
}

wss.on('connection', function connection(ws, req) {
    //adds id to websocket connection for future identification.
    ws.id = numberOfClients;
    let client = new Client(ws);
    clients.set(numberOfClients, client)
    numberOfClients++;
    ws.on('message', function incoming(message) {
        console.log(ws.id);
        console.log('received: %s', message);
        let jsonObject = JSON.parse(message);
        parseJson(jsonObject, ws.id);
  });
  ws.on('close', function() {
      if (clients.get(ws.id).game != undefined) {
          clients.get(ws.id).game.removePlayer(ws.id)
      }
      clients.delete(ws.id)
  })
  console.log('Connected');
  console.log(ws)
});

function parseJson(json, id) {
    let objectData = json.data;
    let messageKey = json.key
    let functionToUse = possibleCommands[json.command];
    functionToUse(objectData, id, messageKey);
}

function checkUndifined() {
    for (let i = 0; i<arguments.length; i++) {
        if (arguments[i] == undefined) {
            return true;
        }
    }
    return false;
}

function printClients() {
    console.log(clients)
}

function printGames() {
    console.log(games);
}

function printPlayers(id) {
    let game = clients.get(id).game;
    console.log(game.players);
}

function Player(name) {
    this.name = name;
    this.location;
}

function updateLocation(json, id) {
    let latitude = json.latitude;
    let longitude = json.longitude;
    let game = clients.get(id).game;
    if (game === undefined) {
        return
    }
    game.updateLocation(id, latitude, longitude)
    var players = game.getPlayers();
    for (const [key, value] of players) {
        console.log('SENDING LOCATION UPDATE TO: ' + key)
        if (key != id && clients.get(key) != undefined) {
             clients.get(key).send(new Message('locationUpdate',null, {playerId : "" 
             + id, newLocation : latitude + ',' + longitude }, null));
        }
    }
}

function tagPlayer(json, id, messageKey) {
    let playerToTag = json.playerToTagId;
    if (checkUndifined(playerToTag)) {
        clients.get(id).send(new Message(null, messageKey, null, 'invalid data'));
        return;
    }
    if (clients.get(id).game === undefined) {
        return;
    }
    var playerTagged = clients.get(id).game.tagPlayer(playerToTag, id)
    if (playerTagged) {
        let players = clients.get(id).game.players;
        for (key in players) {
            if (key != id) {
                clients.get(key).send(new Message('playerTagged', null, {playerId : '' + playerToTag}, null));
            }
        }
        clients.get(id).send(new Message(null, messageKey, {}, null))
    } else {
        clients.get(id).send(new Message(null, messageKey, null, 'not close enough to player to tag'));
    }
}

function joinGame(json, id, messageKey) {
    let gameKey = json.key;
    let playerName = json.playerName;
    if (checkUndifined(gameKey, playerName)) {
        clients.get(id).send(new Message(null, messageKey, null, 'invalid data'));
        return;
    }
    if (!gameExists(gameKey)) {
        clients.get(id).send(new Message(null, messageKey, null, 'invalid key'));
        return;
    }
    games[gameKey].addPlayer(id, playerName);
    clients.get(id).game = games[gameKey]
    clients.get(id).send(new Message(null, messageKey, null, null))
}

function gameExists(key) {
    return games[key] != undefined;
}

function createGame(json, id, messageKey) {
    let gameKey = json.key;
    let gameName = json.gameName;
    if (checkUndifined(gameKey, gameName)) {
        clients.get(id).send(new Message(null, messageKey, null, 'invalid data'));
        return;
    }
    var game = new Game(gameName);
    games[gameKey] = game;
    clients.get(id).send(new Message(null, messageKey, {}, null))
}

function getPlayerInfo(json, id, messageKey) {
    if (clients.get(id).game === undefined) {
        return;
    }
    let player = clients.get(id).game.getPlayerInfo(id);
    clients.get(id).send(new Message(null, messageKey, JSON.stringify(player), null));
}

function getGameInfo(json, id, messageKey) {
    if (clients.get(id).game === undefined) {
        return;
    } 
    let player = clients.get(id).game
}



















