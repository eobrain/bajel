const { promisify } = require('util')
const fs = require('fs')
const mkdtemp = promisify(fs.mkdtemp)
const writeFile = promisify(fs.writeFile)
const os = require('os')
const path = require('path')

module.exports.buildFileTree = async (spec) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'test-'))
  for (const filename in spec) {
    await writeFile(path.join(folder, filename), spec[filename], 'utf8')
  }
  return folder
}

/** Create a temporary file.
 * @param content to write into the file
 * @returns [folder, path] created
 */
module.exports.writeTmpFile = async (content) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'file-'))
  const file = path.join(folder, 'file')
  await writeFile(file, content, 'utf8')
  return [folder, file]
}

/**
 * @param {number} ms milliseconds to sleep
 * @returns {Promise} promise that resolves after the given time.
 */
module.exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
