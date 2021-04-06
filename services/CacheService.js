
const fs = require('fs')
const pathlib = require('path')

class CacheManager {
  constructor ({ root = './.cache', levels = 0, init = true } = {}) {
    this.root = pathlib.resolve(root)
    this.levels = levels

    if (init) this.__init()
  }

  async locate (hash, filename = null, create = true) {
    const dirs = hash.substr(0, this.levels).split('')
    const path = pathlib.join(this.root, ...dirs)
    if (create) this.createDir(path)
    return pathlib.join(path, filename || hash)
  }

  async exists (hash, filename = null) {
    const path = this.locate(hash, filename, false)
    return this.__exists(path)
  }

  async size (hash, filename = null) {
    const path = this.locate(hash, filename, false)
    return this.__exists(path)
  }

  async remove (hash, filename = null) {
    const path = await this.locate(hash, filename, false)
    await fs.promises.rm(path)
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
