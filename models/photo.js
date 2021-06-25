
const fs = require('fs')
const pathlib = require('path')
const { nanoid } = require('nanoid')

const projections = require('../constants/projections')
const aggregations = require('../constants/aggregations')
const _processing = require('./_processing')

module.exports = class Photo extends _processing {
  constructor (coll, { host = '*', processorQueue = null } = {}) {
    super(coll)
    this.host = host
    this.processorQueue = processorQueue
  }

  static get projections () { return projections.photos }
  static get aggregations () { return aggregations.photos }
  static get allowedFileTypes () { return ['.jpg', '.jpeg'] }
  static get defaultGenid () { return () => nanoid(128) }
  static validateId (id) { return (typeof id === 'string' && id.length === 128) }

  static async newDocument ({
    id = null, userId, albumId, parentId, path, name, fileName,
    extension, size,
    created, modified,
    permissions = [],
    indexed = new Date(), processed = {},
    flags = {}, stats = {},
    _processingFlags = []
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
      processed: (processed instanceof Object) ? processed : {},
      flags: (flags instanceof Object) ? flags : {},
      stats: (stats instanceof Object) ? stats : {},
      _processingFlags: (_processingFlags instanceof Array) ? _processingFlags : []
    }
  }

  async getPathPrefixSize (pathPrefix = null) {
    return (await this.aggregateOne({ path: RegExp(`^${pathPrefix}/`) }, Photo.aggregations.totalSize()))?.size || null
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
        console.log(`processQueue.add(${inserted.length} photos)`)
      }
    }
    if (returnOne) return ret[0]
    else return ret
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
}
