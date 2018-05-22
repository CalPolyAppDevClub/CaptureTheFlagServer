const WebSocket = require('ws');


module.exports = class Point {
    construcor(functionMap, authMap) {
        this.functionMap = functionMap;
        this.authMap = authMap;
        this.wss = null;

        wss.options.verifyClient = function(info, callback) {
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
    }

    usePort(port) {
        this.wss = new WebSocket.Server({port: port})
    }

    userExternalServer(server) {
        this.wss = new WebSocket.Server({server: server})
    }

    onConnection(callback) {
        this.wss.on('connection', function connection(ws, req) {
            callback()
        })
    }

    onMessage(callback) {
        for (client of this.wss.clients) {
            client.on('message', function incoming(message) {

            })
        }
    }
}

function setUpServer(wss) {

}


function parseJson(json, id) {
    let objectData = json.data;
    let messageKey = json.key
    let functionToUse = possibleCommands[json.command];
    functionToUse(objectData, id, messageKey);
}

class Client {
    constructor(ws) {
        
    }
}