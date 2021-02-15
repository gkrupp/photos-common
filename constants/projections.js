
const _default = { _id: 0, id: 1 }

const users = {}

const items = {
  all: {},
  default: { ..._default },
  id: { ..._default },
  physical: { ..._default, userId: 1, parentId: 1, path: 1, name: 1, fileName: 1, size: 1, created: 1, modified: 1 }
}

const albums = {
  apiAll: { ..._default, parentId: 1, name: 1, created: 1, modified: 1, indexed: 1, processed: 1, flags: 1 },
  apiBasic: { ..._default, parentId: 1, name: 1, created: 1, modified: 1, flags: 1 },
  apiMinimal: { ..._default, parentId: 1, name: 1 },
  ...items
}

const photos = {
  apiAll: { ..._default, albumId: 1, name: 1, fileName: 1, extension: 1, size: 1, created: 1, modified: 1, indexed: 1, processed: 1, flags: 1, dimensions: 1, exif: 1, thumbnails: 1 },
  apiBasic: { ..._default, name: 1, fileName: 1, size: 1, created: 1, modified: 1, flags: 1, dimensions: 1, thumbnails: 1 },
  apiMinimal: { ..._default, name: 1, dimensions: 1, thumbnails: 1 },
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
