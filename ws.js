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
let clients = new Map();
let games = {};
var possibleCommands = {
    'createGame' : createGame,
    'joinGame' : joinGame,
    'updateLocation' : updateLocation,
    'tagPlayer' : tagPlayer,
    'getPlayerInfo' : getPlayerInfo,
    'getPlayers' : getPlayers,
    'getFlags' : getFlags,
    'getTeams' : getTeams,
    'getGameState' : getGameState,
    'createTeam' : createTeam,
    'getTeams' : getTeams
};

wss.options.verifyClient = function(info, callback) {
    if (info.req.headers.authorization === 'AUTH-TOKEN') {
        callback(true)
    } else {
        callback(false, 1, 'incorrect token')
    }
}

wss.on('connection', function connection(ws, req) {
    //adds id to websocket connection for future identification.
    console.log('New Connection');
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


















function updateLocation(json, id) {
    let latitude = json.latitude;
    let longitude = json.longitude;
    let game = clients.get(id).game;
    console.log('THIS IS IN UPDATE LOCATION FIRST:' + clients.get(id) != undefined)
    if (game === undefined) {
        console.log('UPDATELOCATION GAME UNDIFINED')
        return
    }
    game.updateLocation(id, latitude, longitude)
}

function tagPlayer(json, id, messageKey) {
    let playerToTag = json.playerToTagId;
    if (checkUndifined(playerToTag)) {
        console.log('tagPlayer invalid parameters')
        return;
    }
    if (clients.get(id).game === undefined) {
        return;
    }
    var playerTagged = clients.get(id).game.tagPlayer(playerToTag, id)
    if (playerTagged) {
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
    clients.get(id).game = games[gameKey];
    console.log('JOINGAME');
    clients.get(id).send(new Message(null, messageKey, null, null));
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
    initEvents(game);
    console.log('CREATEGAME');
    clients.get(id).send(new Message(null, messageKey, null, null))
}

function addFlag(json, id, messageKey) {
    let flagLocation = json.flagLocation;
    let flagTeam = json.flagTeam;
    if (checkUndifined(flagLocation, flagTeam)) {
        console.log('addFlag invalid arguments')
        return;
    }
    clients.get(id).game.addFlag(flagLocation);
}

function getPlayerInfo(json, id, messageKey) {
    if (clients.get(id).game === undefined) {
        return;
    }
    let player = clients.get(id).game.getPlayerInfo(id);
    //converts everything to a string
    //let playerWithStringValues = {};
    for (key in player) {
        //playerWithStringValues[key] ="" + player[key]
        console.log('ITEM IN PLAYER ' + key + ', ' + player[key])
    }
    console.log('PLAYER STRINGIFIED' + JSON.stringify(player))
    
    clients.get(id).send(new Message(null, messageKey, player, null));
}

function getFlags(json, id, messageKey) {
    if (clients.get(id).game === undefined) {
        console.log('getFlags: not in a game');
        return;
    }
    let flags = clients.get(id).game.getFlags();
    clients.get(id).send(new Message(null, messageKey, flags, null))
}

function getTeams(json, id, messageKey) {
    if (clients.get(id).game === undefined) {
        console.log('getTeams: not in a game');
        return;
    }
    let teams = clients.get(id).game.getTeams()
    clients.get(id).send(new Message(null, messageKey, teams, null))
}

function getGameState(json, id, messageKey) {
    if (clients.get(id).game == undefined) {
        return
    }
    let gameState = clients.get(id).game.getState()
    clients.get(id).send(new Message(null, messageKey, gameState, null))
}

function getPlayers(json, id, messageKey) {
    if (clients.get(id).game == undefined) {
        return
    }
    let players = clients.get(id).game.getPlayers()
    console.log('THESE ARE THE PLAYEERS ' + players)
    clients.get(id).send(new Message(null, messageKey, players, null))
}

function createTeam(json, id, messageKey) {
    let teamName = json.teamName;
    if (clients.get(id).game == null) {
        console.log('not in a game');
        return;
    }
    if (checkUndifined(teamName)) {
        console.log('invalid arguments');
        return
    }
    clients.get(id).game.addTeam(teamName);
    clients.get(id).send(new Message(null, messageKey, null, null));
}

function getTeams(json, id, messageKey) {
    if (clients.get(id).game == null) {
        console.log('not in a game');
        return
    }
    let teams = clients.get(id).game.getTeams()
    clients.get(id).send(new Message(null, messageKey, teams, null))
}

function initEvents(game) {
    game.on('locationUpdate', function(id, location) {
        let players = game.getPlayers();
        for (key in players) {
            clients.get(players[key].id).send(new Message('locationUpdate', null, {playerId : "" 
            + id, newLocation : location.latitude + ',' + location.longitude }, null));
         }
    })

    game.on('playerTagged', function(playerTaggedId) {
        let players = game.getPlayers();
        for (key in players) {
            clients.get(key).send(new Message('playerTagged', null, {playerId: '' + playerTaggedId}));
        }
    })

    game.on('playerAdded', function(playerAdded) {
        let players = game.getPlayers();
        for (key in players) {
            clients.get(players[key].id).send(new Message('playerAdded', null, playerAdded, null));
        }
    })

    game.on('teamAdded', function(team) {
        let players = game.getPlayers();
        for (key in players) {
            console.log('THIS IS WORKING!!!! ')
            clients.get(players[key].id).send(new Message('teamAdded', null, team, null));
        }
    })
}
