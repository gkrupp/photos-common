
const users = {}

const items = {}

const albums = {
  ...items
}

const photos = {
  ...items,
  processable () {
    return { _processingFlags: { $nin: ['@scan', /^@processing(\/.+)?$/] } }
  },
  processMissing (pipes = null) {
    if (!(pipes instanceof Array)) {
      if (typeof pipes === 'string') pipes = [pipes]
      else pipes = []
    }
    if (pipes.length === 0) {
      return {
        $and: [
          { id: 0 }, { id: 1 }
        ]
      }
    }
    pipes = pipes.map((pipe) => ({
      [`processed.${pipe}.date`]: { $not: { $type: 'date' } }
    }))
    return {
      $and: [
        this.processable(),
        { $or: pipes }
      ]
    }
  },
  versionUpgrade (versions) {
    if (typeof versions !== 'object' || Object.keys(versions).length === 0) {
      return {
        $and: [
          { id: 0 }, { id: 1 }
        ]
      }
    }
    const versionOr = []
    for (const pipe in versions) {
      versionOr.push({
        [`processed.${pipe}.version`]: { $not: { $gte: versions[pipe] } }
      })
    }
    return {
      $and: [
        this.processable(),
        { $or: versionOr }
      ]
    }
  }
}

module.exports = {
  users,
  albums,
  photos
}
