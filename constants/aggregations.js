
const projections = require('./projections')

const allowedSortingFields = ['name', 'created', 'modified']

const { pathPrefixRegExp } = require('../utils')

const modifiers = {
  sort: ({ sort = 'created:1' } = {}) => {
    const sorting = sort
      .split(',')
      .reduce((desc, rule) => {
        rule = rule.split(':')
        if (!allowedSortingFields.includes(rule[0])) {
          return desc
        }
        desc[rule[0]] = Number(rule[1]) || 1
        return desc
      }, {})
    if (Object.keys(sorting).length === 0) {
      sorting.name = 1
    }
    return { $sort: sorting }
  },
  skip: (opt = {}) => ({
    $skip: Number(opt.skip) || 0
  }),
  limit: (opt = {}) => ({
    $limit: Number(opt.limit) || 1024
  }),
  count: (opt = {}) => ({
    $count: opt.countField || 'count'
  })
}

const modifierGroup = {
  sortSkipLimit: (opt) => [
    modifiers.sort(opt),
    modifiers.skip(opt),
    modifiers.limit(opt)
  ]
}

const users = {
  apiAll: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.users.apiAll(opt) }
  ],
  apiDefault: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.users.apiDefault(opt) }
  ],
  apiMinimal: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.users.apiMinimal(opt) }
  ]
}

const items = {
  pathPrefixInfo: (opt = {}) => {
    const $group = {
      _id: ''
    }
    if (opt.size) {
      $group.size = { $sum: '$size' }
    }
    if (opt.span) {
      $group.spanBegin = { $min: '$created' }
      $group.spanEnd = { $max: '$created' }
    }
    return [
      { $match: { path: pathPrefixRegExp(opt.path) } },
      { $group },
      { $project: { _id: 0 } }
    ]
  },
  pathPrefixUsers: (opt = {}) => ([
    { $match: { path: pathPrefixRegExp(opt.path) } },
    { $group: { _id: '$userId' } },
    { $project: { _id: 0, userId: '$_id' } }
  ])
}

const albums = {
  ...items,
  apiAll: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.albums.apiAll(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiDefault: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.albums.apiDefault(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiMinimal: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.albums.apiMinimal(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ]
}

const photos = {
  ...items,
  apiAll: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.photos.apiAll(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiDefault: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.photos.apiDefault(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiMinimal: (opt = {}) => [
    { $match: opt.match },
    { $project: projections.photos.apiMinimal(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ]
}

module.exports = {
  modifiers,
  users,
  albums,
  photos
}
