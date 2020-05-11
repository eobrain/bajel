const { Writable } = require('stream')
const { Console } = require('console')

const TeeStreamToString = wrapped => {
  let string = ''
  const stream = Writable()
  stream._write = (chunk, enc, next) => {
    wrapped._write(chunk, enc, next)
    string += chunk.toString()
    next()
  }
  const toString = () => string
  return { stream, toString }
}

module.exports = () => {
  const stdout = TeeStreamToString(process.stdout)
  const stderr = TeeStreamToString(process.stderr)
  const tConsole = new Console(stdout.stream, stderr.stream)
  const tStdout = () => stdout.toString()
  const tStderr = () => stderr.toString()
  return { tConsole, tStdout, tStderr }
}
