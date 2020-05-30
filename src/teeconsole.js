const externalRequire = require

const { Writable } = externalRequire('stream')
const { Console } = externalRequire('console')

/**
 * @returns {!Object}
 */
module.exports = (enableWrapped = true) => {
  /**
   * @param {!Object} wrapped
   * @return {!Object}
   */
  const TeeStreamToString = wrapped => {
    let string = ''
    const stream = Writable()
    stream._write = (chunk, enc, next) => {
      if (enableWrapped) {
        wrapped._write(chunk, enc, next)
      } else {
        next()
      }
      string += chunk.toString()
    }
    const toString = () => string
    return { stream, toString }
  }

  const stdout = TeeStreamToString(process.stdout)
  const stderr = TeeStreamToString(process.stderr)
  const tConsole = new Console(stdout.stream, stderr.stream)
  const tStdout = () => stdout.toString()
  const tStderr = () => stderr.toString()
  return { tConsole, tStdout, tStderr }
}
