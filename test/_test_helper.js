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
