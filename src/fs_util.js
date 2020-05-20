const externalRequire = require
const fs = externalRequire('fs')
const path = externalRequire('path')
const tmp = externalRequire('tmp')
// const tee = require('./tee.js')

/** @returns timestamp if it is a file, or zero if it does not exist or is a directory. */
const timestamp = path =>
  fs.promises.stat(path)
    .then(s => s.isDirectory() ? 0 : s.mtimeMs)
    .catch(e => 0)

/**  Calls callback for all files (not directories) under the directory
 * shout out https://medium.com/@allenhwkim/nodejs-walk-directory-f30a2d8f038f
 */
const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    if (f.startsWith('.') || f === 'node_modules') {
      return
    }
    const dirPath = path.join(dir, f)
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback)
    } else {
      const childPath = path.join(dir, f)
      if (!fs.statSync(childPath).isDirectory()) {
        callback(childPath)
      }
    }
  })
}

/**
 * @param {string} content
 * @return {string} path written
 */
const writeTmp = content => {
  const path = tmp.fileSync().name
  fs.writeFileSync(path, content)
  return path
}

module.exports = { timestamp, walkDir, writeTmp }
