
const { nanoid } = require('nanoid')

const projections = require('../constants/projections')
const aggregations = require('../constants/aggregations')
const _processing = require('./_processing')

module.exports = class User extends _processing {
  static get projections () { return projections.users }
  static get aggregations () { return aggregations.users }
  static get defaultGenid () { return () => nanoid(32) }
  static validateId (id) { return (typeof id === 'string' && id.length === 32) }

  static async newDocument ({
    id = null,
    userName = 'anonymous', displayName = null
  }, { getStats = false }) {
    return {
      id: (typeof id === 'string') ? id : null,
      userName: (typeof userName === 'string') ? userName : 'anonymous',
      displayName: (typeof displayName === 'string') ? displayName : ((typeof userName === 'string') ? userName : 'anonymous')
    }
  }
}
