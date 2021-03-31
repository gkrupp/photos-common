
const fs = require('fs')
const pathlib = require('path')
const { nanoid } = require('nanoid')

const projections = require('../constants/projections')
const _processing = require('./_processing')

module.exports = class Photo extends _processing {
  constructor (coll, { host = '*', processorQueue = null } = {}) {
    super(coll)
    this.coll = coll
    this.host = host
    this.processorQueue = processorQueue
  }

  static get projections () { return projections.photos }
  static get allowedFileTypes () { return ['.jpg'] }
  static get defaultGenid () { return () => nanoid(128) }
  static validateId (id) { return (typeof id === 'string' && id.length === 128) }

  static async newDocument ({
    id = null, userId, albumId, parentId, path, name, fileName,
    extension, size,
    created, modified,
    permissions = [],
    indexed = new Date(), processed = null,
    flags = {}, stats = {},
    _processingFlags = {}
  }, { getStats = false }) {
    if (getStats) {
      const stat = await fs.promises.stat(path)
      size = stat.size
      created = stat.ctime
      modified = stat.mtime
    }
    return {
      id: (typeof id === 'string') ? id : null,
      userId: (typeof userId === 'string') ? userId : null,
      albumId: (typeof albumId === 'string') ? albumId : (typeof parentId === 'string') ? parentId : null,
      parentId: (typeof parentId === 'string') ? parentId : null,
      path: (typeof path === 'string') ? path : null,
      name: ((typeof name === 'string') ? name : null) || ((typeof path === 'string') ? pathlib.basename(path) : null),
      fileName: ((typeof fileName === 'string') ? fileName : null) || ((typeof path === 'string') ? pathlib.basename(path) : null),
      extension: (typeof extension === 'string') ? extension : ((typeof path === 'string') ? pathlib.extname(path).toLowerCase() : null),
      size: Number(size) || null,
      created: new Date(created) || null,
      modified: new Date(modified) || null,
      permissions: (permissions instanceof Array) ? permissions : [],
      indexed: new Date(indexed),
      processed: processed ? new Date(processed) : null,
      flags: (flags instanceof Object) ? flags : {},
      stats: (stats instanceof Object) ? stats : {},
      _processingFlags: (_processingFlags instanceof Object) ? _processingFlags : {}
    }
  }

  async insert (docs = [], { returnOne = false, process = true } = {}) {
    const isArray = (docs instanceof Array)
    if (isArray && docs.length === 0) return []
    if (!isArray && (returnOne = true)) docs = [docs]
    const ret = await super.insert(docs)
    if (ret && process) {
      if (this.processorQueue === null) {
        console.error(`'processorQueue' is not defined, ${ret} will not be processed automatically`)
      } else {
        const inserted = docs.map((doc, i) => ({ id: ret[i], path: doc.path }))
        await Promise.all(inserted.map(photo => this.processorQueue.add(this.host, photo)))
        await this._processingFlags(ret, { processing: true })
        console.log(`processQueue.add(${inserted.length} photos)`)
      }
    }
    if (returnOne) return ret[0]
    else return ret
  }

  async getServedFromId (id, size = 'original') {
    if (size === 'original') {
      return await this.findOne(id, Photo.projections.serve)
    } else {
      const serve = await this.findOne(id, Photo.projections.thumbnails)
      if (!serve || (typeof serve.thumbnails !== 'object') || !(size in serve.thumbnails)) return null
      else return { id, path: serve.thumbnails[size].path, fileName: serve.fileName }
    }
  }

  async children (userId, parentId, projection = Photo.projections.default) {
    return this.coll.find({ userId, parentId }, { projection }).toArray()
  }

  static merge (inDB, inFS) {
    const insert = []
    const update = []
    const remain = []
    const remove = []
    for (const photo of inFS) {
      const dbPhoto = inDB.find((el) => (el.path === photo.path && el.size === photo.size && el.modified.getTime() === photo.modified.getTime()))
      // insert
      if (dbPhoto === undefined) {
        insert.push(photo)
        continue
      // remain
      } else if (dbPhoto.parentId === photo.parentId) {
        photo.id = dbPhoto.id
        remain.push(dbPhoto.id)
        continue
      // update
      } else {
        photo.id = dbPhoto.id
        update.push({
          query: { id: photo.id },
          update: { $set: { parentId: photo.parentId, albumId: photo.parentId } }
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
    delete doc.hash
    // id
    if (!includeId) {
      delete doc.id
    }
    // user
    if (!includeUser) {
      delete doc.userId
      delete doc.userName
    }
    // thumbnails
    if (typeof doc.thumbnails === 'object') {
      if (['basic', 'minimal'].includes(details)) {
        doc.thumbnails = Object.keys(doc.thumbnails)
      } else {
        for (const size in doc.thumbnails) {
          delete doc.thumbnails[size].path
        }
      }
    }
    // dimensions
    if (typeof doc.dimensions === 'object') {
      if (['basic', 'minimal'].includes(details)) {
        delete doc.dimensions.mpx
        delete doc.dimensions.aspectRatio
        delete doc.dimensions.channels
        delete doc.dimensions.density
        delete doc.dimensions.hasAlpha
      }
    }
    //
    doc._details = details
    return doc
  }

  static async removeThumbs (ids = [], thumbDir = '', thumbTypes = [], extension = '.jpg') {
    const isArray = (ids instanceof Array)
    if (!isArray) ids = [ids]
    await Promise.all(ids.map(id =>
      Promise.all(thumbTypes.map(tnType => {
        const tnPath = pathlib.join(thumbDir, tnType, id + extension)
        return fs.promises.access(tnPath)
          .then(() => fs.promises.unlink(tnPath))
          .catch(() => {})
      }))
    )).catch(console.error)
  }
}
