
class ApiError extends Error {
  constructor ({ status = 400, message = 'ApiError' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

module.exports = {
  ApiError
}
