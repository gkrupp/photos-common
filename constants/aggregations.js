
const projections = require('./projections')

const allowedSortingFields = ['name', 'created', 'modified', 'fileName']

const modifiers = {
  sort: (opt = {}) => {
    const sorting = opt.sort
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
  apiAll: () => [],
  apiDefault: () => [],
  apiMinimal: () => []
}

module.exports = {
  modifiers,
  albums,
  photos
}
