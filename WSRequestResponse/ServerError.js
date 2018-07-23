class ServerError {
    constructor(errorCode, description) {
        this.code = errorCode;
        this.description = description;
    }
}

module.exports = ServerError;