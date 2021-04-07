
const _default = { _id: 0, id: 1 }

const chunks = {
  ids: ({ includeId = true } = {}) => {
    const ret = { _id: 0 }
    if (includeId) ret.id = 1
    return ret
  },
  createmod: () => ({
    created: 1,
    modified: 1
  }),
  processing: () => ({
    indexed: 1,
    processed: 1,
    mlprocessed: 1
  }),
  naming: () => ({
    name: 1,
    fileName: 1
  }),
  sizing: () => ({
    'dimensions.width': 'width',
    'dimensions.height': 'height'
  }),
  meta: () => ({
    dimensions: 1,
    exif: 1
  }),
  ml: () => ({
    'colors.rgb': 1,
    objects: 1
  })
}

const users = {}

const items = {
  all: {},
  default: { ..._default },
  id: { ..._default },
  physical: { ..._default, userId: 1, parentId: 1, path: 1, ...chunks.naming(), size: 1, ...chunks.createmod() },
  serve: { ..._default, path: 1, fileName: 1, permissions: 1 }
}

const albums = {
  apiAll: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    albumId: 1,
    ...chunks.naming(opt),
    ...chunks.createmod(opt),
    permissions: 1,
    ...chunks.processing(opt),
    flags: 1
  }),
  apiDefault: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    name: 1,
    created: 1,
    flags: 1
  }),
  apiMinimal: (opt = {}) => ({
    ...chunks.ids(opt),
    name: 1,
    created: 1
  }),
  ...items
}

const photos = {
  // apiAll: { ..._default, userId: 1, albumId: 1, ..._chunks.naming, extension: 1, size: 1, ..._chunks.createmod, ..._chunks.processing, flags: 1, ..._chunks.sizing, thumbnails: 1, ..._chunks.meta, ..._chunks.ml },
  // apiDefault: { ..._default, userId: 1, ..._chunks.naming, ..._chunks.createmod, flags: 1, ..._chunks.sizing },
  // apiMinimal: { ..._default, userId: 1, name: 1, dimensions: 1 },
  processor: { ..._default, path: 1 },
  thumbnails: { ..._default, thumbnails: 1, fileName: 1 },
  ...items
}

module.exports = {
  users,
  albums,
  photos
}
