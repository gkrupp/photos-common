
const queries = require('../constants/queries').users
const projections = require('../constants/projections').users
const aggregations = require('../constants/aggregations').users
const _Item = require('./_item')

module.exports = class User extends _Item {
  static get idLength () { return 16 }
  static get queries () { return queries }
  static get projections () { return projections }
  static get aggregations () { return aggregations }

  static async newDocument ({
    id = null,
    userName = 'anonymous', displayName = null
  }) {
    return {
      id: (typeof id === 'string') ? id : null,
      userName: (typeof userName === 'string') ? userName : 'anonymous',
      displayName: (typeof displayName === 'string') ? displayName : ((typeof userName === 'string') ? userName : 'anonymous')
    }
  }
}
