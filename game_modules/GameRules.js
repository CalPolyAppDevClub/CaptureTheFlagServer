const exporter = {}

exporter.dropFlags = (player, flags) => {
    let droppedFlags = []
    let flagsHeld = player.flagsHeld
    flags.forEach((flag) => {
        let deleted = flagsHeld.delete(flag)
        if (deleted) {
            droppedFlags.push(flag)
        }
    })
    droppedFlags.forEach((flag) => {
        flag.bounds.setCenter(player.bounds.center)
    })
}

exporter.drop = (holder, heldItems) => {
    let droppedItems = []
    let heldItems = holder.heldItems
    heldItems.forEach((item) => {
        let dropped = heldItems.delete(item)
        if (dropped) {
            droppedItems.push(item)
        }
    })
    droppedItems.forEach((item) => {
        item.location = holder.location
    })
}