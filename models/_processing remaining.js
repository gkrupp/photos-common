
class _processing {
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
}

module.exports = _processing
