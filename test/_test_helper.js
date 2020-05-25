const { promisify } = require('util')
const fs = require('fs')
const mkdtemp = promisify(fs.mkdtemp)
const writeFile = promisify(fs.writeFile)
const os = require('os')
const path = require('path')
// const tee = require('../src/tee')

module.exports.buildFileTree = async (spec) => {
  const folder = await mkdtemp(path.join('.', 'test-'))
  for (const filename in spec) {
    await writeFile(path.join(folder, filename), spec[filename], 'utf8')
  }
  const cleanup = () => {
    fs.rmdirSync(folder, { recursive: true })
  }
  return { folder, cleanup }
}

/** Create a temporary file.
 * @param content to write into the file
 * @returns {{filePath,cleanup}}
 */
module.exports.writeTmpFile = async (content) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'file-'))
  const filePath = path.join(folder, 'file')
  await writeFile(filePath, content, 'utf8')
  const cleanup = () => {
    fs.rmdirSync(folder, { recursive: true })
  }
  return { filePath, cleanup }
}

/**
 * @param {number} ms milliseconds to sleep
 * @returns {Promise} promise that resolves after the given time.
 */
module.exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
