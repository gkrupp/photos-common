
const fs = require('fs')
const pathlib = require('path')
const { nanoid } = require('nanoid')

const archiver = require('archiver')

const projections = require('../constants/projections')
const aggregations = require('../constants/aggregations')
const _processing = require('./_processing')

module.exports = class Album extends _processing {
  static get projections () { return projections.albums }
  static get aggregations () { return aggregations.albums }
  static get idLength () { return 32 }
  static get defaultGenid () { return () => nanoid(this.idLength) }
  static validateId (id) { return (typeof id === 'string' && id.length === this.idLength) }

  static async newDocument ({
    id = null, userId, albumId,
    path, name, created, modified,
    permissions = [],
    indexed = new Date(), processed = {},
    flags = {}, stats = {},
    _processingFlags = []
  }, { getStats = false }) {
    if (getStats) {
      const stat = await fs.promises.stat(path)
      created = stat.ctime
      modified = stat.mtime
    }
    return {
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
    }
  }

  async children (userId, albumId, projection = Album.projections.default) {
    return this.coll.find({ userId, albumId }, { projection }).toArray()
  }

  async getServedFromId (id, writeStream = null, { type = 'zip', statConcurrency = 2, level = 0 } = {}) {
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
    if (writeStream) {
      archive.pipe(writeStream)
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
