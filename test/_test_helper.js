const { promisify } = require('util')
const fs = require('fs')
const mkdtemp = promisify(fs.mkdtemp)
const writeFile = promisify(fs.writeFile)
const os = require('os')
const path = require('path')
const { Writable } = require('stream')

module.exports.StreamToString = () => {
  let string = ''
  const stream = Writable()
  stream._write = (chunk, enc, next) => {
    string += chunk.toString()
    next()
  }
  const toString = () => string
  return { stream, toString }
}

module.exports.buildFileTree = async (spec) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'test-'))
  for (const filename in spec) {
    await writeFile(path.join(folder, filename), spec[filename], 'utf8')
  }
  return folder
}
