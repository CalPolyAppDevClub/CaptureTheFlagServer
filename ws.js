const WebSocket = require('ws');
const Events = require('events');
const Message = require('./WSRequestResponse/message');
const Game = require('./game_modules/game');
const geo = require('geolib');
const http = require('http');
const express = require('express');
const GameFailureReason = require('./game_modules/GameFailureReason');
const RRWS = require('./WSRequestResponse/').Server

let app = express();

const PORT = process.env.PORT || 8000;
console.log('LISTENING TO ' + PORT)

app.use(express.static(__dirname + "/"));

var server = http.createServer(app)
server.listen(PORT)

console.log("http server listening on %d", PORT)

function verifyClient(info, callback) {
    if (info.req.headers.authorization === 'AUTH-TOKEN') {
        callback(true)
    } else {
        callback(false, 1, 'incorrect token')
    }
}

let wss = new RRWS({server: server, verifyClient: verifyClient})

//var wss = new WebSocket.Server({server: server})
console.log("websocket server created")


let clients = new Map();
let games = {};

wss.on('connection', function connection(number) {
    //adds id to websocket connection for future identification.
    console.log('New Connection');
    let clientAdded = {id: number}
    clients.set(number, clientAdded)
  /*ws.on('close', function() {
      if (clients.get(ws.id).game != undefined) {
          clients.get(ws.id).game.removePlayer(ws.id)
      }
      clients.delete(ws.id)
  })
  console.log('Connected');
  console.log(ws)*/
});

const generalError = {
    gameDoesNotExist: 'gameDoesNotExist'
}

wss.on('close', function(number) {
    if (clients.get(number).game != undefined) {
        clients.get(number).game.removePlayer(number)
    }
    clients.delete(number)
})

wss.onCommand('updateLocation', ['latitude', 'longitude'], function(req, resp) {
    let latitude = req.latitude;
    let longitude = req.longitude;
    let game = clients.get(id).game;
    if (game === undefined) {
        resp.data.error = 'player not in game';
    }
    game.updateLocation(req.id, latitude, longitude);
})

wss.onCommand('tagPlayer', ['playerToTagId'], function(req, resp) {
    let playerToTag = req.data.playerToTagId;
    let id = req.id;
    if (clients.get(playerToTag).game === undefined) {
        resp.data.error = 'player being tagged not in game';
        resp.send();
        return;
    }
    if (clients.get(id).game === undefined) {
        resp.data.error = 'not in game';
        resp.send()
        return;
    }
    let playerTaggedSuccess = clients.get(id).game.tagPlayer(playerToTag, id);
    if (playerTaggedSuccess === undefined) {
        resp.send();
    } else {
        resp.data.error = playerTaggedSuccess;
        resp.send();
    }
})

wss.onCommand('joinGame', ['key', 'playerName'], function(req, resp) {
    let gameKey = req.data.key;
    let playerName = req.data.playerName;
    if (!gameExists(gameKey)) {
        resp.data.error = generalError.gameDoesNotExist
        resp.send()
        return;
    }
    let error = games[gameKey].addPlayer(req.id, playerName);
    clients.get(req.id).game = games[gameKey]
    if (error == undefined) {
        resp.send();
    } else {
        resp.data = {}
        resp.data.error = error;
        resp.send();
    }
})

wss.onCommand('joinTeam', ['teamId'], function(req, resp) {
    let teamToJoinId = req.data.teamId;
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'not in a game';
        resp.send();
        return;
    }
    let game = clients.get(req.id).game;
    game.addToTeam(req.id, teamToJoinId)
})

wss.onCommand('nextGameState', null, function(req, resp) {
    let game = clients.get(req.id).game
    if (game === undefined) {
        resp.data.error = generalError.gameDoesNotExist
        resp.send()
        return
    }
    game.nextGameState()

})

function gameExists(key) {
    console.log(key)
    return games[key] != undefined;
}

wss.onCommand('createGame', ['key', 'gameName'], function(req, resp) {
    let gameKey = req.data.key;
    let gameName = req.data.gameName;
    let game = new Game(gameName);
    games[gameKey] = game;
    initEvents(game);
    resp.send();
    console.log('GAMES')
    console.log(games)
})

function addFlag(json, id, messageKey) {
    let flagLocation = json.flagLocation;
    let flagTeam = json.flagTeam;
    if (checkUndifined(flagLocation, flagTeam)) {
        console.log('addFlag invalid arguments')
        return;
    }
    clients.get(id).game.addFlag(flagLocation);
}

wss.onCommand('getPlayerInfo', null, function(req, rssp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'not in a game';
        resp.send();
        return;
    }
    let player = clients.get(req.id).game.getPlayerInfo(req.id);
    //converts everything to a string
    //let playerrEWithStringValues = {}
    for (key in player) {
        console.log('ITEM IN PLAYER ' + key + ', ' + player[key]);
    }
    resp.data.player = player;
    resp.send();
})

wss.onCommand('getFlags', null, function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getFlags: player not in game';
        resp.send();
        return;
    }
    let flags = clients.get(req.id).game.getFlags();
    resp.data = {}
    resp.data.flags = flags;
    resp.send();
})

wss.onCommand('getTeams', null, function(req, resp){
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getTeams: not in game';
        resp.send();
        return;
    }
    let teams = clients.get(id).game.getTeams();
    resp.data = {};
    resp.data.teams = teams;
    resp.send();
})

wss.onCommand('getGameState', null, function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getGameState: not in a game'
        resp.send();
        return;
    }
    let gameState = clients.get(req.id).game.getState();
    resp.data = {}
    resp.data.gameState = gameState;
    resp.send()
})

wss.onCommand('getPlayers', null, function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getPlayers: player not in game';
        resp.send();
        return;
    }
    let players = clients.get(req.id).game.getPlayers();
    resp.data = {};
    resp.data.players = players;
    //console.log('This is get players')
    //console.log(resp.data.players)
    resp.send();
})

wss.onCommand('createTeam', ['teamName'], function(req, resp) {
    //console.log('create team is being called')
    let teamName = req.data.teamName;
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'createTeam: not in game';
        resp.send();
        return;
    }
    let error = clients.get(req.id).game.addTeam(teamName);
    console.log(error)
    if (error != undefined) {
        resp.data.error = error
    }
    resp.send();
})

wss.onCommand('getTeams', null, function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getTeams: not in game';
        resp.send();
        return;
    }
    let teams = clients.get(req.id).game.getTeams();
    resp.data.teams = teams;
    resp.send();
})

function initEvents(game) {
    game.on('locationUpdate', function(id, location) {
        let players = game.getPlayers();
        let data = {
            playerId : '' + id, newLocation: location.latitude + ',' + location.longitude
        };
        for (key in players) {
            wss.send('locationUpdate', data, key);
         }
    })

    game.on('playerTagged', function(playerTaggedId) {
        let players = game.getPlayers();
        let data = {
            playerId: ' + playerTaggedId'
        }
        for (key in players) {
            wss.send('playerTagged', data, key)
        }
    })

    game.on('playerAdded', function(playerAdded) {
        let players = game.getPlayers();
        for (key in players) {
            wss.send('playerAdded', playerAdded, key)
        }
    })

    game.on('teamAdded', function(team) {
        let players = game.getPlayers();
        for (key in players) {
            wss.send('teamAdded', team, key);
        }
    })
    
    game.on('playerRemoved', function(playerId) {
        let players = game.getPlayers();
        for (key in players) {
            wss.send('playerRemoved', playerId, key);
        }
    })

    game.on('flagAdded', function(flag) {
        let players = game.getPlayers();
        for (key in players) {
            wss.send('flagAdded', flag, key);
        }
    })

    game.on('playerJoinedTeam', function(playerId, teamId) {
        let teamAndPlayer = {
            id : playerId,
            team : teamId
        }
        let players = game.getPlayers()
        for (key in players) {
            console.log(typeof key)
            wss.send('playerJoinedTeam', teamAndPlayer, key);
        }
    })

    game.on('gameStateChanged', function(gameState) {
        let players = game.getPlayers()
        for (key in players) {
            wss.send('gameStateChanged', gameState, key)
        }
    })
}
