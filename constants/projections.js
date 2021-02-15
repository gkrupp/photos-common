
const _default = { _id: 0, id: 1 }

const users = {}

const items = {
  all: {},
  default: { ..._default },
  id: { ..._default },
  physical: { ..._default, userId: 1, parentId: 1, path: 1, name: 1, fileName: 1, size: 1, created: 1, modified: 1 }
}

const albums = {
  ...items
}

const photos = {
  processor: { ..._default, path: 1 },
  serve: { ..._default, path: 1, fileName: 1 },
  thumbnails: { ..._default, thumbnails: 1, fileName: 1 },
  ...items
}

module.exports = {
  users,
  albums,
  photos
}
