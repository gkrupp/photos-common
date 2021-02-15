const Bull = require('bull')

const queues = {}
const defaultQueueOptions = {
  defaultJobOptions: {
    attempts: 4,
    removeOnComplete: true,
    removeOnFail: true
  }
}

async function init ({ redis, limiter }) {
  defaultQueueOptions.redis = redis
  defaultQueueOptions.limiter = limiter
}
async function stop () {
  for (const name in queues) {
    await queues[name].close()
  }
}

function create (name, config = {}) {
  if (name in queues) {
    throw new Error(`Queue name '${name}' already exists.`)
  }
  const queue = new Bull(name, Object.assign(defaultQueueOptions, config))
  queues[name] = queue
  return queue
}

module.exports = {
  init,
  stop,
  create
}
