
const fs = require('fs')
const pathlib = require('path')

const projections = require('../constants/projections')
const aggregations = require('../constants/aggregations')
const _item = require('./_item')

const { pathPrefixRegExp } = require('../utils')

module.exports = class Photo extends _item {
  static get idLength () { return 64 }
  static get projections () { return projections.photos }
  static get aggregations () { return aggregations.photos }
  static get nativeSupportTypes () { return ['.jpg', '.jpeg'] }
  static get allowedTypes () { return this.nativeSupportTypes.concat([]) }

  static init ({ coll = null, host = null, processorQueue = null }) {
    this.coll = coll
    this.host = host
    this.processorQueue = processorQueue
    return this
  }

  constructor (coll, { host = '*', processorQueue = null } = {}) {
    super(coll)
    this.host = host
    this.processorQueue = processorQueue
  }

  static async newDocument ({
    id = null, userId, albumId,
    path, name, extension, size,
    created, modified,
    permissions = [],
    indexed = new Date(), processed = {},
    flags = {}, stats = {},
    _processingFlags = []
  }, { getStats = false }) {
    if (getStats) {
      const stat = await fs.promises.stat(path)
      size = stat.size
      created = created || stat.ctime
      modified = modified || stat.mtime
    }
    return new this({
      // ids
      id: (typeof id === 'string') ? id : null,
      userId: (typeof userId === 'string') ? userId : null,
      albumId: (typeof albumId === 'string') ? albumId : null,
      // physical
      path: (typeof path === 'string') ? path : null,
      name: ((typeof name === 'string') ? name : null) || ((typeof path === 'string') ? pathlib.basename(path) : null),
      extension: (typeof extension === 'string') ? extension : ((typeof path === 'string') ? pathlib.extname(path).toLowerCase() : null),
      size: Number(size) || null,
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

  async getPathPrefixInfo (pathPrefix = null, tailingSlash = false) {
    return this.aggregateOne({ path: pathPrefixRegExp(pathPrefix, tailingSlash) }, Photo.aggregations.pathPrefixInfo()) || null
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
        console.log(`processorQueue.add(${inserted.length} photos)`)
      }
    }
    if (returnOne) return ret[0]
    else return ret
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
      } else if (dbPhoto.albumId === photo.albumId) {
        photo.id = dbPhoto.id
        remain.push(dbPhoto.id)
        continue
      // update
      } else {
        photo.id = dbPhoto.id
        update.push({
          query: { id: photo.id },
          update: { $set: { albumId: photo.albumId } }
        })
        continue
      }
    }
    return { insert, update, remain, remove }
  }
}
