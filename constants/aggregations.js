
const projections = require('./projections')

const allowedSortingFields = ['name', 'created', 'modified']

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
    { $project: projections.users.apiAll(opt) }
  ],
  apiDefault: (opt = {}) => [
    { $project: projections.users.apiDefault(opt) }
  ],
  apiMinimal: (opt = {}) => [
    { $project: projections.users.apiMinimal(opt) }
  ]
}

const albums = {
  apiAll: (opt = {}) => [
    { $project: projections.albums.apiAll(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiDefault: (opt = {}) => [
    { $project: projections.albums.apiDefault(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiMinimal: (opt = {}) => [
    { $project: projections.albums.apiMinimal(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ]
}

const photos = {
  apiAll: (opt = {}) => [
    { $project: projections.photos.apiAll(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiDefault: (opt = {}) => [
    { $project: projections.photos.apiDefault(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  apiMinimal: (opt = {}) => [
    { $project: projections.photos.apiMinimal(opt) },
    ...modifierGroup.sortSkipLimit(opt)
  ],
  pathPrefixInfo: (opt = {}) => [
    {
      $group: {
        _id: '',
        spanBegin: { $min: '$created' },
        spanEnd: { $max: '$created' },
        size: { $sum: '$size' }
      }
    },
    { $project: { _id: 0 } }
  ],
  totalSize: (opt = {}) => [
    { $group: { _id: '', size: { $sum: '$size' } } }
  ]
}

module.exports = {
  modifiers,
  users,
  albums,
  photos
}
