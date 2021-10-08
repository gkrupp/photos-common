'use strict'

const fs = require('fs')
const pathlib = require('path')

const queries = require('../constants/queries').albums
const projections = require('../constants/projections').albums
const aggregations = require('../constants/aggregations').albums
const _Item = require('./_item')

class Album extends _Item {
  static get idLength () { return 32 }
  static get queries () { return queries }
  static get projections () { return projections }
  static get aggregations () { return aggregations }

  static async newDocument ({
    id = null, userId, albumId,
    path, name, created, modified,
    permissions = [],
    indexed = new Date(), processed = {},
    flags = {}, stats = {},
    _processingFlags = []
  }, { getStats = false } = {}) {
    if (getStats) {
      const stat = await fs.promises.stat(path)
      created = stat.ctime
      modified = stat.mtime
    }
    return new this({
      // ids
      id: (typeof id === 'string') ? id : null,
      userId: (typeof userId === 'string') ? userId : null,
      albumId: (typeof albumId === 'string') ? albumId : null,
      // physical
      path: (typeof path === 'string') ? path : null,
      name: ((typeof name === 'string') ? name : null) || ((typeof path === 'string') ? pathlib.basename(path) : null),
      created: created ? new Date(created) : new Date(),
      modified: modified ? new Date(modified) : new Date(),
      // ownership
      permissions: (permissions instanceof Array) ? permissions : [],
      // proc
      indexed: new Date(indexed),
      processed: (processed instanceof Object) ? processed : {},
      flags: (flags instanceof Object) ? flags : {},
      stats: (stats instanceof Object) ? stats : {},
      _processingFlags: (_processingFlags instanceof Array) ? _processingFlags : []
    })
  }

  async getPathPrefixUsers () {
    return this.constructor.getPathPrefixUsers(this.path)
  }

  static async getPathPrefixUsers (path) {
    const users = await this.aggregate(this.aggregations.pathPrefixUsers({ path }))
    return users.map(user => user.userId)
  }

  //

  async serve (stream, { type = 'zip', statConcurrency = 2, level = 0 } = {}) {
    return this.constructor.serve(this.id, stream, { type, statConcurrency, level })
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
      } else if (dbAlbum.albumId === album.albumId) {
        album.id = dbAlbum.id
        remain.push(dbAlbum.id)
        continue
      // update
      } else {
        album.id = dbAlbum.id
        update.push({
          id: album.id,
          update: { albumId: album.albumId }
        })
        continue
      }
    }
    return { insert, update, remain, remove }
  }
}

module.exports = Album
