module.exports = class BiDirectionalMap {
    constructor(interable) {
        this._forward = new Map(interable)
        this._reverse = new Map()
        for (let entry of this._forward.entries()) {
            this._reverse.set(entry[1], entry[0])
        }
    }

    deleteWithKey(key) {
        let value = this._forward.get(key)
        let removed = this._forward.delete(key)
        this._reverse.delete(value)
        return removed
    }

    deleteWithValue(value) {
        let key = this._reverse.get(value)
        let removed = this._reverse.delete(value)
        this._forward.delete(key)
        return removed
    }

    forwardEntries() {
        return this._forward.entries()
    }

    reverseEntries() {
        return this._reverse.entries()
    }

    forEachForward(callback) {
        this._forward.forEach(callback)
    }

    forEachReverse(callback) {
        this._forward.forEach(callback)
    }

    getForward(key) {
        return this._forward.get(key)
    }

    getReverse(value) {
        return this._reverse.get(value)
    }

    keys() {
        return this._forward.keys()
    }

    set(key, value) {
        this._forward.set(key, value)
        this._reverse.set(value, key)
        return this
    }

    values() {
        this._forward.values()
    }

}