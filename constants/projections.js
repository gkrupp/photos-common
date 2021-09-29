
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
    processed: 1
  }),
  ar: () => ({
    ar: '$dimensions.aspectRatio'
  }),
  wh: () => ({
    width: '$dimensions.width',
    height: '$dimensions.height'
  }),
  shade: () => ({
    shade: { $arrayElemAt: ['$colors.dominant.hex', 0] }
  }),
  meta: () => ({
    dimensions: 1,
    exif: 1,
    location: 1
  }),
  location: () => ({
    location: '$location.coordinates'
  }),
  features: () => ({
    colors: {
      dominant: '$colors.dominant.hex',
      prominent: '$colors.prominent.hex'
    }
  })
}

const users = {
  apiAll: (opt = {}) => ({
    ...chunks.ids(opt),
    userName: 1,
    displayName: 1
  }),
  apiDefault: (opt = {}) => ({
    ...chunks.ids(opt),
    userName: 1,
    displayName: 1
  }),
  apiMinimal: (opt = {}) => ({
    ...chunks.ids(opt),
    userName: 1,
    displayName: 1
  })
}

const items = {
  all: {},
  // default: { ..._default },
  id: (opt) => ({
    ...chunks.ids(opt)
  }),
  path: (opt) => ({
    ...chunks.ids(opt),
    path: 1
  }),
  physical: (opt) => ({
    ...chunks.ids(opt),
    albumId: 1,
    path: 1,
    name: 1,
    size: 1,
    ...chunks.createmod(opt)
  }),
  processor: (opt) => ({
    ...chunks.ids(opt),
    path: 1,
    processed: 1
  }),
  serve: (opt) => ({
    ...chunks.ids(opt),
    path: 1,
    name: 1,
    permissions: 1,
    ...chunks.wh(opt)
  })
}

const albums = {
  ...items,
  apiAll: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    albumId: 1,
    name: 1,
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
  })
}

const photos = {
  ...items,
  apiAll: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    albumId: 1,
    name: 1,
    extension: 1,
    size: 1,
    ...chunks.createmod(opt),
    permissions: 1,
    ...chunks.processing(opt),
    flags: 1,
    ...chunks.ar(opt),
    ...chunks.shade(opt),
    ...chunks.meta(opt),
    ...chunks.features(opt)
  }),
  apiDefault: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    name: 1,
    created: 1,
    flags: 1,
    ...chunks.ar(opt),
    ...chunks.shade(opt)
  }),
  apiMinimal: (opt = {}) => ({
    ...chunks.ids(opt),
    ...chunks.ar(opt)
  })
}

module.exports = {
  users,
  albums,
  photos
}
