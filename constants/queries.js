
const users = {}

const items = {}

const albums = {
  ...items
}

const photos = {
  ...items,
  processable (pipes = null) {
    if (!(pipes instanceof Array)) {
      if (typeof pipes === 'string') pipes = [pipes]
      else pipes = []
    }
    pipes = pipes.map((pipe) => ({
      [`processed.${pipe}.date`]: { $not: { $type: 'date' } }
    }))
    return {
      $and: [
        { _processingFlags: { $nin: ['@scan', /^@processing(\/.+)?$/] } },
        ...pipes
      ]
    }
  }
}

module.exports = {
  users,
  albums,
  photos
}
