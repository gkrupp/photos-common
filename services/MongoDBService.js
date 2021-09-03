
const mongodb = require('mongodb')

const MongoClient = mongodb.MongoClient
let connection = null
const colls = {}

async function init ({ uri, db, options, collections }) {
  const client = new MongoClient(uri, options)
  connection = await client.connect()
  if (!connection) throw Error('Unable to connect to database')
  const DB = connection.db(db)
  for (const coll in collections) {
    colls[coll] = DB.collection(collections[coll])
  }
  console.log('Database ready')
}

async function stop () {
  await connection.close()
}

module.exports = {
  init,
  stop,
  colls
}
