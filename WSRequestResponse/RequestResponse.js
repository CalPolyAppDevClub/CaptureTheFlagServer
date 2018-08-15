const WebSocket = require('ws');
const Events = require('events')
const Message = require('./message')
const ServerError = require('./ServerError')
const uuid = require('uuid/v4')
let self;
module.exports = class WSRequestResponse extends Events.EventEmitter {
    constructor(options) {
        super()
        this._commands = {}
        this._connectionNumber = 0;
        this._connections = new Map()
        this._webSocketServer = new WebSocket.Server(options);
        this._webSocketServer.on
        self = this;
        this._webSocketServer.on('connection', (ws, req) => {
            if (req.headers['reconnect'] !== undefined) {
                handleReconnection.call(this, req.headers['RECONNECT'], ws)
                let number = req.headers['reconnect']
                this._connections.set(number, ws)
                setupWebsocket.call(this, ws, number)
            } else {
                let number = uuid()
                ws.send(JSON.stringify({RECONNECTID: number}))
                self._connections.set(number, ws)
                self.emit('connection', '' + number)
                setupWebsocket.call(this, ws, number)
            }
        })
    }

    send(command, data, id) {
        if (this._connections.get(id) !== undefined) {
            this._connections.get(id).send(JSON.stringify(new Message(command, null, data, null)))
        }
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

function setupWebsocket(ws, number) {
    ws.on('message', (message) => {
        let messageObject = JSON.parse(message)
        if (!messageIsValid(messageObject)) {
            let messageToSend = JSON.stringify(new Message(null, messageObject.key, null, new ServerError(200, 'Bad Mesaage')))
            ws.send(messageToSend)
            return
        }
        if (!checkParams.call(this, messageObject)) {
            ws.send(JSON.stringify(new Message(null, messageObject.key, null, new ServerError(250, 'Invalid Arguments'))))
            return
        }
        let req = {
            data : messageObject.data,
            id : number
        }
        let callbackToUse = this._commands[messageObject.command].callback
        let resp = new Response(ws, messageObject.key)
        callbackToUse(req, resp)
    })

    ws.on('close', function() {
        self._connections.delete(number)
        self.emit('close', number)
    })
}


function handleReconnection(reconnectId, ws) {
    if (this._connections.get(reconnectId) !== undefined) {
        this._connections.get(reconnectId).close()
        this._connections.delete(reconnectId)
        this._connections.set(reconnectId, ws)
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