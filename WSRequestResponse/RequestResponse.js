const WebSocket = require('ws');
const Events = require('events')
const Message = require('./message')
const ServerError = require('./ServerError')
let self;
module.exports = class WSRequestResponse extends Events.EventEmitter {
    constructor(options) {
        super()
        this._commands = {}
        this._connectionNumber = 0;
        this._connections = new Map()
        this._webSocketServer = new WebSocket.Server(options);
        self = this;
        this._webSocketServer.on('connection', function(ws, req) {
            self._connections.set(self._connectionNumber, ws)
            self.emit('connection', '' + self._connectionNumber)
            let number = self._connectionNumber
            self._connectionNumber++
            
            ws.on('message', function(message) {
                let messageObject = JSON.parse(message)
                console.log(messageObject.command)
                if (messageIsValid(messageObject)) {
                    if (checkParams.call(self, messageObject)) {
                        let req = {
                            data : messageObject.data,
                            id : '' + number
                        }
                        let callbackToUse = self._commands[messageObject.command].callback
                        let resp = new Response(ws, messageObject.key)
                        callbackToUse(req, resp)
                    } else {
                        ws.send(JSON.stringify(new Message(null, messageObject.key, null, new ServerError(250, 'Invalid Arguments'))))
                    }
                } else {
                    let messageToSend = JSON.stringify(new Message(null, messageObject.key, null, new ServerError(200, 'Bad Message')))
                    ws.send(messageToSend)
                }
            })
            ws.on('close', function() {
                self._connections.delete()
                self.emit('close', number)
            })
        })
    }

    send(command, data, id) {
        this._connections.get(Number(id)).send(JSON.stringify(new Message(command, null, data, null)))
    }

    onCommand(command, paramNames, callback) {
        this._commands[command] = {
            paramNames : paramNames,
            callback : callback
        }
    }
}

class Response {
    constructor(ws, messageKey) {
        this._ws = ws
        this._messageKey = messageKey
        this.data = {}
    }

    send() {
        if (this.data === undefined) {
            this.data = null
        }
        this._ws.send(JSON.stringify(new Message(null, this._messageKey, this.data, null)))
    }
}

function checkParams(message) {
    let realParamNames = this._commands[message.command].paramNames
    let paramNamesToCheck = message.data
    if (realParamNames !== null && paramNamesToCheck === null) {
        return false
    }
    if (realParamNames === null && paramNamesToCheck === null) {
        return true
    }
    let paramsAccurate = false
    realParamNames.forEach(function(paramName) {
        Object.keys(paramNamesToCheck).forEach(key => {
            if (key !== paramName) {
                return
        }
            paramsAccurate = true
        }) 
    })
    return paramsAccurate
}

function messageIsValid(message) {
    if (message.command === undefined || message.key === undefined || 
        message.data === undefined || message.error === undefined) {
            return false
        }
        return true
}