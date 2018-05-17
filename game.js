const geoLib = require('geolib')

class Game {
    constructor(name, locationCallback) {
        this.players = {};
        this.flags = [];
        this.name = name;
    }

    checkIfAlreadyInGame(id) {
        for (let i = 0; i<this.players.length;i++) {
            if (this.players[i].refNumber == id) {
                return true;
            }
        }
        return false;
    }

    addPlayer(id, playerName) {
        let player = new Player(playerName, id);
        this.players[id] = player;
        
    }

    updateLocation(id, latitude, longitude) {
        let location = {
            latitude : latitude,
            longitude : longitude
        }
        this.players[id].location = location;
    }

    tagPlayer(playerToTagId, idOfTaggingPlayer) {
        console.log(playerToTagId + ", " + idOfTaggingPlayer)
        let distanceBetweenPlayers = geoLib.getDistance(this.players[playerToTagId].location, 
            this.players[idOfTaggingPlayer].location);
        if (distanceBetweenPlayers <= 40) {
            this.players[playerToTagId].isTagged = true;
            return true;
        }
        return false;
    }

    
}

class Player {
    constructor(name, id) {
        this.name = name;
        this.location;
        this.hasFlag = false;
        this.team;
        this.id = id;
        this.isTagged = false;
    }
}

module.exports = Game;