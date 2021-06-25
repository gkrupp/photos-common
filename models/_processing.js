
const { nanoid } = require('nanoid')

class _processing {
  constructor (coll) {
    this.coll = coll
  }

  static get projections () { return {} }
  static get aggregations () { return {} }
  static get defaultRetries () { return 3 }
  static get defaultGenid () { return nanoid }
  static canProcess (pipes = null) {
    if (!(pipes instanceof Array)) {
      if (typeof pipes === 'string') pipes = [pipes]
      else pipes = []
    }
    pipes = pipes.map((pipe) => ({
      [`processed.${pipe}.date`]: { $not: { $type: 'date' } }
    }))
    return {
      $and: [
        { _processingFlags: { $nin: ['@scan', /^@processing(\/.+)?$/] } },
        ...pipes
      ]
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

  async findOne (query, projection) {
    if (typeof query === 'string') query = { id: query }
    return this.coll.findOne(query, { projection })
  }

  async find (query, projection, { sort = null, skip = null, limit = null, toArray = true, count = false } = {}) {
    if (typeof query === 'string') return this.findOne(query, projection)
    if (query instanceof Array) query = { id: { $id: query } }
    const res = this.coll.find(query, { projection })
    if (count) return res.count()
    if (sort) res.sort(sort)
    if (skip) res.skip(skip)
    if (limit) res.limit(limit)
    if (toArray) return res.toArray()
    return res
  }

  async aggregate (query, pipeline = [], { toArray = true } = {}) {
    let res
    if (query === null) {
      res = this.coll.aggregate(pipeline)
    } else {
      res = this.coll.aggregate([{ $match: query }, ...pipeline])
    }
    if (toArray) return res.toArray()
    return res
  }

  async aggregateOne (query, pipeline = []) {
    let res
    if (query === null) {
      res = await this.coll.aggregate(pipeline).toArray()
    } else {
      res = await this.coll.aggregate([{ $match: query }, ...pipeline]).toArray()
    }
    if (res && res.length > 0) return res[0]
    else return null
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

  async updateOne (query, update) {
    if (typeof query === 'string') query = { id: query }
    return (await this.coll.updateOne(query, update)).result.nModified
  }

  async updateMany (query, update) {
    return (await this.coll.updateMany(query, update)).result.nModified
  }

  async deleteOne (query) {
    if (typeof query === 'string') query = { id: query }
    return (await this.coll.deleteOne(query)).deletedCount
  }

  async deleteMany (query) {
    return (await this.coll.deleteMany(query)).deletedCount
  }

  async countChildItems (albumId) {
    return await this.find({ albumId }, null, { count: true })
  }

  async getItems (query, opt = {}, { one = false } = {}) {
    const defaultDetails = 'default'
    const defaultAggregation = 'apiDefault'
    const details = (opt.details || defaultDetails).toLowerCase()
    // aggr
    let aggr = ['api', details[0].toUpperCase() + details.slice(1)].join('')
    if (!(aggr in this.constructor.aggregations)) aggr = defaultAggregation
    const aggrPipe = this.constructor.aggregations[aggr](opt)
    // exec
    if (one) return this.aggregateOne(query, aggrPipe)
    else return this.aggregate(query, aggrPipe)
  }

  async updateEventStat (id, event = 'served', target = null, change = 1, last = new Date(), statField = 'stats') {
    // event:  [ served, cacheServed ]
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
    sets[setField] = last
    // update
    const isArray = (id instanceof Array)
    if (!isArray) return this.coll.updateOne({ id }, { $inc: incs, $set: sets })
    else return this.coll.updateMany({ id: { $in: id } }, { $inc: incs, $set: sets })
  }

  async pushProcessingFlags (query, ...flags) {
    // query preprocessing
    if (typeof query === 'string') {
      query = { id: query }
    } else if (query instanceof Array) {
      query = { id: { $in: query } }
    }
    // update
    return (await this.coll.updateMany(query, {
      $addToSet: { _processingFlags: { $each: flags.flat() } }
    })).result.nModified
  }

  async popProcessingFlags (query, ...flags) {
    // query preprocessing
    if (typeof query === 'string') {
      query = { id: query }
    } else if (query instanceof Array) {
      query = { id: { $in: query } }
    }
    // update
    return (await this.coll.updateMany(query, {
      $pullAll: { _processingFlags: flags.flat() }
    })).result.nModified
  }
}

module.exports = _processing
