class Message {
    constructor(command, data, error) {
        this.command = command;
        this.data = data;
        this.error = error;
    }
}

module.exports = Message;