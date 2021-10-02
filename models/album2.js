'use strict'

const fs = require('fs')
const pathlib = require('path')
const archiver = require('archiver')

const queries = require('../constants/queries').albums
const projections = require('../constants/projections').albums
const aggregations = require('../constants/aggregations').albums
const _Item = require('./_item')

class Album extends _Item {
  static get idLength () { return 32 }
  static get queries () { return queries }
  static get projections () { return projections }
  static get aggregations () { return aggregations }

  static init ({ coll = null, photo = null }) {
    this.coll = coll
    this.Photo = photo
    return this
  }

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

  async getInfo (info = {}) {
    return this.constructor.getInfo(this.path, info)
  }

  static async getInfo (path, info = {}) {
    const aggrOpts = {
      path,
      ...info
    }
    return this.Photo.aggregateOne(Album.aggregations.pathPrefixInfo(aggrOpts))
  }

  //

  async serve (stream, { type = 'zip', statConcurrency = 2, level = 0 } = {}) {
    return this.constructor.serve(this.id, stream, { type, statConcurrency, level })
  }

  static async serve (id, stream = null, { type = 'zip', statConcurrency = 2, level = 0 } = {}) {
    const serve = await this.findOne(id, Album.projections.serve())
    if (!serve) return null
    // archive
    const archive = archiver(type, {
      statConcurrency,
      zlib: { level }
    })
    archive.on('warning', (err) => {
      console.error(err)
      throw err
    })
    archive.on('error', (err) => {
      throw err
    })
    archive.directory(serve.path, serve.name)
    if (stream) {
      archive.pipe(stream)
      await archive.finalize()
      return serve
    } else {
      return {
        ...serve,
        archive
      }
    }
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
