#!/usr/bin/env node

const build = require('./index.js')
const buildfile = require('./buildfile.js')
// const { pp } = require('passprint')

const main = async () => {
  try {
    const [code] = await build(await buildfile())
    return code
  } catch (e) {
    const fileMessage = e.readingFile ? ` reading file ${e.readingFile}` : ''
    console.error(`ERROR${fileMessage}: ${e.message}`)
    return 1
  }
}

module.exports = main // for testing

main().then(code => process.exit(code))
