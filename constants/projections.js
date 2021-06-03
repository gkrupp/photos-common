
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
  naming: () => ({
    name: 1,
    fileName: 1
  }),
  wh: () => ({
    width: '$dimensions.width',
    height: '$dimensions.height'
  }),
  meta: () => ({
    dimensions: 1,
    exif: 1
  }),
  ml: () => ({
    /*
    colors: {
      palette: '$colors.palette.rgb',
      prominent: '$colors.prominent.rgb'
    },
    objects: {
      preds: 1,
      labels: 1
    }
    */
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
  // id: { ..._default },
  // physical: { ..._default, userId: 1, parentId: 1, path: 1, ...chunks.naming(), size: 1, ...chunks.createmod() },
  processor: (opt) => ({
    ...chunks.ids(opt),
    path: 1
  }),
  serve: (opt) => ({
    ...chunks.ids(opt),
    path: 1,
    fileName: 1,
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
  })
}

const photos = {
  ...items,
  apiAll: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    albumId: 1,
    ...chunks.naming(opt),
    extension: 1,
    size: 1,
    ...chunks.createmod(opt),
    permissions: 1,
    ...chunks.processing(opt),
    flags: 1,
    ...chunks.wh(opt),
    ...chunks.meta(opt),
    ...chunks.ml(opt)
  }),
  apiDefault: (opt = {}) => ({
    ...chunks.ids(opt),
    userId: 1,
    name: 1,
    created: 1,
    flags: 1,
    ...chunks.wh(opt)
  }),
  apiMinimal: (opt = {}) => ({
    ...chunks.ids(opt),
    name: 1,
    created: 1,
    ...chunks.wh(opt)
  })
}

module.exports = {
  users,
  albums,
  photos
}
