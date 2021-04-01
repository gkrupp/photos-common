
const { nanoid } = require('nanoid')

class _processing {
  constructor (coll) {
    this.coll = coll
  }

  static get projections () { return {} }
  static get defaultRetries () { return 3 }
  static get defaultGenid () { return nanoid }
  static get canProcess () {
    return {
      $and: [{
        $or: [
          { '_processingFlags.processing': { $exists: false } },
          { '_processingFlags.processing': false }
        ]
      }, {
        $or: [
          { '_processingFlags.mlprocessing': { $exists: false } },
          { '_processingFlags.mlprocessing': false }
        ]
      }, {
        $or: [
          { '_processingFlags.processingError': { $exists: false } },
          { '_processingFlags.processingError': null }
        ]
      }, {
        $or: [
          { '_processingFlags.mlprocessingError': { $exists: false } },
          { '_processingFlags.mlprocessingError': null }
        ]
      }]
    }
  }

  async insert (docs = [], { returnOne = false } = {}) {
    const isArray = (docs instanceof Array)
    if (isArray && docs.length === 0) return []
    if (!isArray && (returnOne = true)) docs = [docs]
    const ret = await this.insertMany(docs)
    if (returnOne) return ret[0]
    else return ret
  }

  async update (ids = [], update = {}) {
    if (ids instanceof Array) {
      if (ids.length === 0) return []
      return this.updateMany({ id: { $in: ids } }, update)
    } else {
      return this.updateOne({ id: ids }, update)
    }
  }

  async delete (ids = []) {
    if (ids instanceof Array) {
      if (ids.length === 0) return []
      return this.deleteMany({ id: { $in: ids } })
    } else {
      return this.deleteOne({ id: ids })
    }
  }

  async findOne (filter, projection) {
    if (typeof filter === 'string') filter = { id: filter }
    return this.coll.findOne(filter, { projection })
  }

  async find (filter, projection, { sort = null, skip = null, limit = null, toArray = true, count = false } = {}) {
    if (typeof filter === 'string') return this.findOne(filter, projection)
    if (filter instanceof Array) filter = { id: { $id: filter } }
    const res = this.coll.find(filter, { projection })
    if (sort) res.sort(sort)
    if (skip) res.skip(skip)
    if (limit) res.limit(limit)
    if (toArray) return res.toArray()
    if (count) return res.count()
    return res
  }

  async insertOne (document = null, genid = this.constructor.defaultGenid, retries = this.constructor.defaultRetries) {
    return (await this.insertMany([document], genid, retries))[0]
  }

  async insertMany (documents = [], genid = this.constructor.defaultGenid, retries = this.constructor.defaultRetries) {
    const insertedIds = []
    const n = documents.length
    while (retries-- > 0) {
      let inserted = 0
      documents.forEach((document) => { document.id = genid() })
      try {
        const res = await this.coll.insertMany(documents)
        inserted = res.insertedCount
      } catch (err) {
        inserted = err.result.result.nInserted
      }
      for (let i = 0; i < inserted; ++i) {
        insertedIds.push(documents[i].id)
      }
      documents = documents.slice(inserted)
      if (insertedIds.length === n) {
        return insertedIds
      }
    }
    await this.coll.deleteMany({ id: { $in: insertedIds } })
    throw new Error(`Album creation has been failed. (${insertedIds.length}/${n})`)
  }

  async updateOne (filter, update) {
    return (await this.coll.updateOne(filter, update)).result.nModified
  }

  async updateMany (filter, update) {
    return (await this.coll.updateMany(filter, update)).result.nModified
  }

  async deleteOne (query) {
    return (await this.coll.deleteOne(query)).deletedCount
  }

  async deleteMany (query) {
    return (await this.coll.deleteMany(query)).deletedCount
  }

  async updateEventStat (id, event = 'served', target = null, change = 1, last = new Date(), statField = 'stats') {
    // event:  [ served, searched ]
    // target: [ original ]
    // increments
    const incs = {}
    const incField = (target)
      ? [statField, event, target].join('.')
      : [statField, event].join('.')
    incs[incField] = change
    // dates
    const sets = {}
    const lastField = ['last', event.charAt(0).toUpperCase(), event.slice(1)].join('')
    const setField = (target)
      ? [statField, lastField, target].join('.')
      : [statField, lastField].join('.')
    sets[setField] = new Date()
    // update
    const isArray = (id instanceof Array)
    if (!isArray) return this.coll.updateOne({ id }, { $inc: incs, $set: sets })
    else return this.coll.updateMany({ id: { $in: id } }, { $inc: incs, $set: sets })
  }

  async _processingFlags (query, flags) {
    flags = _processing.convertFlags(flags, '_processingFlags')
    if (typeof query === 'string') {
      query = { id: query }
    } else if (query instanceof Array) {
      query = { id: { $in: query } }
    }
    return (await this.coll.updateMany(query, { $set: flags })).result.nModified
  }

  static convertFlags (flags, baseField = '_processingFlags') {
    const query = {}
    for (const name in flags) {
      const field = [baseField, name].join('.')
      query[field] = flags[name]
    }
    return query
  }
}

module.exports = _processing
