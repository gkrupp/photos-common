
const fs = require('fs')
const pathlib = require('path')

class FileCacheManager {
  constructor ({ root = './.cache', levels = 0, init = true, expire = 0 } = {}) {
    this.root = pathlib.resolve(root)
    this.levels = levels
    this.expire = expire
    this.interval = null

    if (init) this.__init()
    if (expire) {
      this.interval = setInterval(this.clean.bind(this), expire)
    }
  }

  async locate (name, create = true) {
    const dirs = name.substr(0, this.levels).split('')
    const path = pathlib.join(this.root, ...dirs)
    if (create) await this.createDir(path)
    return pathlib.join(path, name)
  }

  async exists (name) {
    const path = await this.locate(name, false)
    return this.__exists(path)
  }

  async size (name) {
    const path = await this.locate(name, false)
    return this.__size(path)
  }

  async createDir (path, recursive = true) {
    if (!(await this.__exists(path))) {
      await fs.promises.mkdir(path, { recursive })
      return false
    } else {
      return true
    }
  }

  async createFile (name, content, options) {
    const path = await this.locate(name)
    return await fs.promises.writeFile(path, content, options)
      .then(() => true)
      .catch(() => false)
  }

  async remove (name) {
    const path = await this.locate(name, false)
    return await fs.promises.rm(path)
      .then(() => true)
      .catch(() => false)
  }

  async clean (expire = null) {
    if (expire === null) expire = this.expire
    if (expire === 0) return true
    return this.erase(true)
  }

  async erase (confirm = false, reinit = true) {
    if (!confirm) {
      console.info('Cache erase had not been confirmed, no operation!')
      return false
    } else {
      await fs.promises.rmdir(this.root, { recursive: true })
      if (reinit) this.__init()
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

module.exports = FileCacheManager
