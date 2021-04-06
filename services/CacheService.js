
const fs = require('fs')
const pathlib = require('path')

class CacheManager {
  constructor ({ root = './.cache', levels = 0, init = true } = {}) {
    this.root = pathlib.resolve(root)
    this.levels = levels

    if (init) this.__init()
  }

  async locate (hash, ext = null, create = true) {
    const dirs = hash.substr(0, this.levels).split('')
    const path = pathlib.join(this.root, ...dirs)
    if (create) await this.createDir(path)
    return pathlib.join(path, this.__filename(hash, ext))
  }

  async exists (hash, ext = null) {
    const path = await this.locate(hash, ext, false)
    return this.__exists(path)
  }

  async size (hash, ext = null) {
    const path = await this.locate(hash, ext, false)
    return this.__exists(path)
  }

  async remove (hash, ext = null) {
    const path = await this.locate(hash, ext, false)
    await fs.promises.rm(path)
      .then(() => true)
      .catch(() => false)
  }

  async erase (confirm = false, reinit = true) {
    if (!confirm) {
      console.info('Cache had not been confirmed, not erased!')
      return false
    } else {
      await fs.promises.rmdir(this.root, { recursive: true })
      if (reinit) this.__init()
    }
  }

  async createDir (path, recursive = true) {
    if (!(await this.__exists(path))) {
      await fs.promises.mkdir(path, { recursive })
      return false
    } else {
      return true
    }
  }

  __init () {
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root)
    }
  }

  __filename (hash, ext) {
    return (ext)
      ? [hash, (ext instanceof Array) ? ext.join('.') : ext].join('.')
      : hash
  }

  async __exists (path) {
    return fs.promises.access(path)
      .then(() => true)
      .catch(() => false)
  }

  async __size (path) {
    return fs.promises.stat(path)
      .then((stat) => stat.size)
      .cache(() => 0)
  }
}

module.exports = CacheManager
