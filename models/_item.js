
/*
coll = {deleteMany () { console.log('dm'); return {deletedCount:2} }, deleteOne () { console.log('do'); return {deletedCount:1} }}
*/

const { nanoid } = require('nanoid')

class _Item {
  static genId () { return nanoid(this.idLength) }
  static validateId (id) { return (typeof id === 'string' && id.length === this.idLength) }
  static get defRetries () { return 3 }

  static init ({ coll = null }) {
    this.coll = coll
    return this
  }

  constructor (doc) {
    for (const prop in doc) {
      this[prop] = doc[prop]
    }
    if (this.id === undefined) {
      this.id = null
    }
  }

  async insert () { return this.constructor.insert(this.doc) }
  async update (up) { return this.constructor.updateOne(this.id, up) }
  async save () { return this.constructor.updateOne(this.id, this.doc) }
  async delete () { return this.constructor.delete(this.id) }

  //

  async children (projection) {
    return this.constructor.children(this.id, projection)
  }

  //

  static async children (albumId, projection) {
    return this.find({ albumId }, { projection })
  }

  //

  static async findOne (query, projection) {
    if (query === null) return 0
    if (typeof query === 'string') query = { id: query }
    return new this(await this.coll.findOne(query, { projection }))
  }

  static async find (query, projection, { sort = null, skip = null, limit = null, toArray = true, count = false } = {}) {
    if (query === null) return 0
    if (typeof query === 'string') {
      return this.findOne(query, projection)
    }
    query = this.QTT(query)
    const res = this.coll.find(query, { projection })
    if (count) return res.count()
    if (sort) res.sort(sort)
    if (skip) res.skip(skip)
    if (limit) res.limit(limit)
    if (toArray) return res.toArray()
    return res
  }

  static async insert (docs) {
    const isArray = (docs instanceof Array)
    if (isArray && docs.length === 0) return []
    if (!isArray) docs = [docs]
    if (!docs.every(doc => typeof doc.id !== 'string')) {
      throw Error('insert(doc): doc.id already exists')
    }
    const insertedIds = []
    const n = docs.length
    let retries = this.defRetries
    do {
      let inserted = 0
      docs.forEach((doc) => { doc.id = this.genId() })
      try {
        const res = await this.coll.insertMany(docs)
        inserted = res.insertedCount
      } catch (err) {
        inserted = err.result.result.nInserted
      }
      for (let i = 0; i < inserted; ++i) {
        insertedIds.push(docs[i].id)
      }
      docs = docs.slice(inserted)
      if (insertedIds.length === n) {
        return isArray ? insertedIds : insertedIds[0]
      }
    } while (--retries > 0)
    await this.coll.deleteMany({ id: { $in: insertedIds } })
    throw new Error(`Album insertion failed. (${insertedIds.length}/${n})`)
  }

  static async updateOne (query, up) {
    if (query === null) return 0
    if (typeof query === 'string') query = { id: query }
    return (await this.coll.updateOne(query, up)).result.nModified
  }

  static async updateMany (query, up) {
    if (query === null) return 0
    return (await this.coll.updateMany(query, up)).result.nModified
  }

  static async update (query, up, multi = false) {
    if (query === null) return 0
    if (!multi) return this.updateOne(query, up)
    else return this.updateMany(query, up)
  }

  static async save (docs) {
    if (!(docs instanceof Array)) docs = [docs]
    if (!docs.every(doc => typeof doc === 'object' && typeof doc.id === 'string')) {
      throw TypeError('save([doc,..]): array elements have to be objects with id property')
    }
    return (await Promise.all(docs.map(doc => this.updateOne(doc.id, doc))))
      .reduce((acc, val) => (acc += val), 0)
  }

  static async deleteOne (query) {
    if (query === null) return 0
    if (typeof query === 'string') {
      return (await this.coll.deleteOne({ id: query })).deletedCount
    }
    query = this.QTT(query)
    return (await this.coll.deleteOne(query)).deletedCount
  }

  static async delete (query) {
    if (query === null) return 0
    if (typeof query === 'string') {
      return (await this.coll.deleteOne({ id: query })).deletedCount
    }
    query = this.QTT(query)
    return (await this.coll.deleteMany(query)).deletedCount
  }

  static async aggregate (pipeline, { toArray = true } = {}) {
    const res = this.coll.aggregate(pipeline)
    if (toArray) return res.toArray()
    return res
  }

  //

  static async pushProcessingFlags (query, ...flags) {
    query = this.QTT(query)
    return this.updateMany(query, {
      $addToSet: { _processingFlags: { $each: flags.flat() } }
    })
  }

  static async popProcessingFlags (query, ...flags) {
    query = this.QTT(query)
    return this.updateMany(query, {
      $pullAll: { _processingFlags: flags.flat() }
    })
  }

  //

  static QTT (query) {
    // 'id'
    if (typeof query === 'string') {
      return { id: query }
    // [q,..]
    } else if (query instanceof Array) {
      // []
      if (query.length === 0) {
        query = null
      // ['id',..]
      } else if (query.every(q => typeof q === 'string' && q.length === this.idLength)) {
        query = { id: { $in: query } }
      // [doc,..]
      } else if (query.every(q => typeof q === 'object' && q?.id?.length === this.idLength)) {
        query = { id: { $in: query.map(q => q.id) } }
      // ERR
      } else {
        console.log(query)
        throw TypeError('QTT([el,..]): array elements have to be id strings or objects with id property')
      }
    }
    return query
  }
}

module.exports = _Item
