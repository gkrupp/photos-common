
const fs = require('fs')
const pathlib = require('path')
const { nanoid } = require('nanoid')

const archiver = require('archiver')

const projections = require('../constants/projections')
const _processing = require('./_processing')

module.exports = class Album extends _processing {
  constructor (coll) {
    super(coll)
    this.coll = coll
  }

  static get projections () { return projections.albums }
  static get defaultGenid () { return () => nanoid(64) }
  static validateId (id) { return (typeof id === 'string' && id.length === 64) }

  static async newDocument ({
    id = null, userId, albumId, parentId, path, name, fileName,
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
      albumId: (typeof albumId === 'string') ? albumId : (typeof parentId === 'string') ? parentId : null,
      parentId: (typeof parentId === 'string') ? parentId : null,
      path: (typeof path === 'string') ? path : null,
      name: ((typeof name === 'string') ? name : null) || ((typeof fileName === 'string') ? fileName : null) || ((typeof path === 'string') ? path.match(/([^/]*)\/*$/)[1] : null),
      fileName: ((typeof fileName === 'string') ? fileName : null) || ((typeof path === 'string') ? pathlib.basename(path) : null),
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

  async getServedFromId (id, writeStream = null, { type = 'zip', statConcurrency = 2, level = 0 } = {}) {
    const serve = await this.findOne(id, Album.projections.serve)
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
    archive.directory(serve.path, serve.fileName)
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

  static publicTransform (doc, details = 'basic', { includeId = true, includeUser = true } = {}) {
    if (typeof doc !== 'object') return doc
    delete doc._id
    delete doc.path
    delete doc.permissions
    delete doc.stats
    delete doc._processingFlags
    // id
    if (!includeId) {
      delete doc.id
    }
    // user
    if (!includeUser) {
      delete doc.userId
      delete doc.userName
    }
    //
    doc._details = details
    return doc
  }
}
