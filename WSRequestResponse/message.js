class Message {
    constructor(command, key, data, error) {
        this.command = command;
        this.key = key;
        this.data = data;
        this.error = error;
    }
}

module.exports = Message;