class Bob {
    constructor() {
        this.something = 'something'
    }

    testFunction() {
        console.log('test function was called')
    }
}

Bob.prototype.tester = function() {
    console.log('tester')
}

let testBob  = new Bob()



console.log(testBob.prototype)