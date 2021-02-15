
const fs = require('fs')
const { nanoid } = require('nanoid')

const projections = require('../constants/projections')
const _processing = require('./_processing')

module.exports = class Album extends _processing {
  constructor (coll) {
    super(coll)
    this.coll = coll
  }

  static get projections () { return projections.albums }
  static get defaultGenid () { return () => nanoid(64) }

  static async newDocument ({
    id = null, userId, parentId, path, name,
    created, modified,
    permissions = [],
    indexed = new Date(), processed = null,
    flags = {}, stats = {},
    _processingFlags = {}
  }, { getStats = false }) {
    if (getStats) {
      const stat = await fs.promises.stat(path)
      created = stat.ctime
      modified = stat.mtime
    }
    return {
      id: (typeof id === 'string') ? id : null,
      userId: (typeof userId === 'string') ? userId : null,
      parentId: (typeof parentId === 'string') ? parentId : null,
      path: (typeof path === 'string') ? path : null,
      name: ((typeof name === 'string') ? name : null) || ((typeof path === 'string') ? path.match(/([^/]*)\/*$/)[1] : null),
      created: new Date(created) || null,
      modified: new Date(modified) || null,
      permissions: (permissions instanceof Array) ? permissions : [],
      indexed: new Date(indexed),
      processed: processed ? new Date(processed) : new Date(indexed),
      flags: (flags instanceof Object) ? flags : {},
      stats: (stats instanceof Object) ? stats : {},
      _processingFlags: (_processingFlags instanceof Object) ? _processingFlags : {}
    }
  }

  async children (userId, parentId, projection = Album.projections.default) {
    return this.coll.find({ userId, parentId }, { projection }).toArray()
  }

  static merge (inDB, inFS) {
    const insert = []
    const update = []
    const remain = []
    const remove = []
    for (const album of inFS) {
      const dbAlbum = inDB.find((el) => (el.path === album.path))
      // insert
      if (dbAlbum === undefined) {
        insert.push(album)
        continue
      // remain
      } else if (dbAlbum.parentId === album.parentId) {
        album.id = dbAlbum.id
        remain.push(dbAlbum.id)
        continue
      // update
      } else {
        album.id = dbAlbum.id
        update.push({
          id: album.id,
          update: { parentId: album.parentId }
        })
        continue
      }
    }
    return { insert, update, remain, remove }
  }
}
