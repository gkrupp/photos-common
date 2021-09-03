
module.exports = {
  pathPrefixRegExp (path) {
    path = path
      .replace(/\//g, '\\/')
      .replace(/ /g, '\\s')
    return RegExp(`^${path}(\\/|$)`)
  }
}
