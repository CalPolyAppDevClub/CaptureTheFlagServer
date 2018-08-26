const WebSocket = require('ws');
const Events = require('events');
const Message = require('./WSRequestResponse/message');
const Game = require('./game_modules/game');
const geo = require('geolib');
const http = require('http');
const express = require('express');
const GameFailureReason = require('./game_modules/GameFailureReason');
const RRWS = require('./WSRequestResponse/').Server
const uuid = require('uuid/v4')
const bodyParser = require('body-parser')

let app = express();
const PORT = process.env.PORT || 8000;
console.log('LISTENING TO ' + PORT)
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())
var server = http.createServer(app)
server.listen(PORT)
console.log("http server listening on %d", PORT)
function verifyClient(info, callback) {
    console.log(info)
}



let wss = new RRWS({server: server})

console.log("websocket server created")



let games = {};

class User {
    constructor(name, game, id) {
        this.name = name
        this.game = game
        this.id = id
    }
}

//for auth only(will be in database)
let userKeyMap = new Map()
let userAccounts = {'Ethan' : 'Ethan123', 'Bob' : 'Bobby123', 'Sam' : 'Sam123', 'Fred' : 'Fred123'}


let users = new Map()
let clients = new Map();
userIdToConnectionKey = new Map()

wss.on('connection', function connection(number, headers) {
    console.log('New Connection');
    //let clientAdded = {id: number}
    let username = userKeyMap.get(headers['authkey'])
    let user = users.get(username)
    if (user == undefined) {
        let newUserId = uuid()
        let newUser = new User(username, undefined, newUserId)
        users.set(username, newUser)
        users.set(newUserId, newUser)
        user = users.get(username)
    }
    clients.set(number, user)
    userIdToConnectionKey.set(user.id, number)
});

wss.on('close', function(number) {
   clients.delete(number)
})

const generalError = {
    gameDoesNotExist: 'gameDoesNotExist',
    notInAGame: 'notInAGame',
    playerBeingTaggedNotInAGame: 'playerBeingTaggedNotInAGame'
}




wss.onCommand('updateLocation', ['latitude', 'longitude'], function(req, resp) {
    console.log('location update sent')
    let latitude = req.data.latitude;
    let longitude = req.data.longitude;
    let game = clients.get(req.id).game;
    if (game === undefined) {
        resp.data.error = 'player not in game';
    }
    game.updateLocation(clients.get(req.id).id, latitude, longitude);
})

wss.onCommand('tagPlayer', ['playerToTagId'], function(req, resp) {
    let playerToTag = req.data.playerToTagId;
    let id = req.id;
    resp.data = {}
    if (users.get(playerToTag).game === undefined) {
        resp.data = {}
        resp.data.error = generalError.playerBeingTaggedNotInAGame;
        resp.send();
        return;
    }
    if (clients.get(id).game === undefined) {
        resp.data.error = generalError.notInAGame;
        resp.send()
        return;
    }
    let playerTaggedSuccess = clients.get(id).game.tagPlayer(playerToTag, clients.get(id).id);
    if (playerTaggedSuccess === undefined) {
        resp.data = {}
        resp.send();
    } else {
        resp.data = {}
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
    let error = games[gameKey].addPlayer(clients.get(req.id).id, playerName);
    clients.get(req.id).game = games[gameKey]
    if (error == undefined) {
        //clients.set(req.id, clients.get())
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
    game.addToTeam(clients.get(req.id).id, teamToJoinId)
})

wss.onCommand('enterGame', ['gameId', 'userId'], function(req, resp) {

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
    return games[key] != undefined;
}

wss.onCommand('createGame', ['key', 'gameName'], function(req, resp) {
    let gameKey = req.data.key;
    let gameName = req.data.gameName;
    let game = new Game(gameName);
    games[gameKey] = game;
    initEvents(game);
    resp.send();
})

wss.onCommand('createFlag', ['latitude', 'longitude'], function(req, resp) {
    let location = {latitude: req.data.latitude, longitude: req.data.longitude}
    if (clients.get(req.id).game === undefined) {
        resp.data = {}
        resp.data.error = generalError.notInAGame
        resp.send()
        return
    }
    let placeFlagError = clients.get(req.id).game.addFlag(clients.get(req.id).id, location)
    if (placeFlagError === undefined) {
        resp.data = {}
        resp.data.error = placeFlagError
        resp.send()
    } else {
        resp.send()
    }
})

wss.onCommand('getPlayerInfo', null, function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'not in a game';
        resp.send();
        return;
    }
    let player = clients.get(req.id).game.getPlayerInfo(clients.get(req.id).id);
    //converts everything to a string
    //let playerrEWithStringValues = {}
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

wss.onCommand('pickUpFlag', ['flagId'], function(req, resp) {
    if (clients.get(req.id).game === undefined) {
        resp.data = {};
        resp.data.error = generalError.notInAGame;
        resp.send();
        return;
    }
    let gameError = clients.get(req.id).game.pickUpFlag(req.data.flagId, clients.get(req.id).id);
    if (gameError !== undefined) {
        resp.data = {};
        resp.data.error = gameError;
        resp.send();
    } else {
        resp.send();
    }
})

wss.onCommand('getTeams', null, function(req, resp){
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'getTeams: not in game';
        resp.send();
        return;
    }
    let teams = clients.get(req.id).game.getTeams();
    resp.data = {};
    resp.data.teams = teams;
    resp.send();
})

wss.onCommand('getCurrentGameState', null, function(req, resp) {
    console.log('get current game state')
    if (clients.get(req.id).game === undefined) {
        resp.data.error = generalError.notInAGame
        resp.send()
        return
    }
    let game = clients.get(req.id).game
    let players = game.getPlayers()
    let flags = game.getFlags()
    let teams = game.getTeams()
    let stateData = {
        players: players,
        flags: flags,
        teams: teams
    }
    resp.data.stateData = stateData
    resp.send()
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
    resp.send();
})



wss.onCommand('createTeam', ['teamName'], function(req, resp) {
    let teamName = req.data.teamName;
    if (clients.get(req.id).game === undefined) {
        resp.data.error = 'createTeam: not in game';
        resp.send();
        return;
    }
    let error = clients.get(req.id).game.addTeam(teamName);
    if (error != undefined) {
        resp.data.error = error
    }
    resp.send();
})

//these will be on an authentication server eventually
app.post('/authenticate', (req, res) => {
    //console.log(req)
    let data = req.body
    //console.log(data)
    let username = data.username
    let password = data.password

    if (userAccounts[username] == password) {
        if (userKeyMap[username] == undefined) {
            let authKey = uuid()
            userKeyMap.set(authKey, username)
            res.send({key: authKey})
        } else {
            res.send({key: userKeyMap[username]})
        }
    } else {
        res.send()
    }
})

app.post('/createAcount', (req, res) => {
    let data = req.body.data
    let userName = data.userName
    let password = data.password

    userAccounts[userName] = password
    res.send()
})

function initEvents(game) {



    game.on('locationUpdate', function(id, location) {
        let players = game.getPlayers();
        let data = {
            playerId : '' + id, 
            newLocation: location
        };
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('locationUpdate', data, sendKey);
         }
    })

    game.on('playerTagged', function(playerTaggedId, flagHeldLocation) {
        let players = game.getPlayers();
        let data = {
            playerId: '' + playerTaggedId,
        }
        if (flagHeldLocation !== null) {
            data.flagHeldLocation = flagHeldLocation
        }
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('playerTagged', data, sendKey)
        }
    })

    game.on('playerAdded', function(playerAdded) {
        let players = game.getPlayers();
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('playerAdded', playerAdded, sendKey)
        }
    })

    game.on('teamAdded', function(team) {
        let players = game.getPlayers();
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            console.log('team added')
            console.log(sendKey)
            wss.send('teamAdded', team, sendKey);
        }
    })
    
    game.on('playerRemoved', function(playerId) {
        let players = game.getPlayers();
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('playerRemoved', playerId, sendKey);
        }
    })

    game.on('flagAdded', function(flag, teamId) {
        let players = game.getPlayers();
        let flagAndTeam = {
            flag: flag,
            teamId: teamId
        }
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('flagAdded', flagAndTeam, sendKey);
        }
    })

    game.on('playerJoinedTeam', function(playerId, teamId) {
        let teamAndPlayer = {
            id : playerId,
            team : teamId
        }
        let players = game.getPlayers()
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('playerJoinedTeam', teamAndPlayer, sendKey);
        }
    })

    game.on('gameStateChanged', function(gameState) {
        let players = game.getPlayers()
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('gameStateChanged', gameState, sendKey)
        }
    })

    game.on('flagPickedUp', function(flagId, playerId) {
        let players = game.getPlayers()
        let flagIdAndPlayerId = {
            flagId: flagId,
            playerId: playerId
        }
        for (key in players) {
            let sendKey = userIdToConnectionKey.get(key)
            wss.send('flagPickedUp', flagIdAndPlayerId, sendKey)
        }
    })
}
