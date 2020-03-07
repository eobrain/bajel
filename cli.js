#!/usr/bin/env node

const fs = require('fs')
const build = require('./index.js')

const main = async () => {
  const prefix = process.cwd() + '/build.'

  let bajelfile
  if (fs.existsSync(prefix + 'cjs')) {
    bajelfile = require(prefix + 'cjs')
  } else if (fs.existsSync(prefix + 'mjs')) {
    bajelfile = (await import(prefix + 'mjs')).default
  } else if (fs.existsSync(prefix + 'json')) {
    bajelfile = JSON.parse(fs.readFileSync(prefix + 'json', 'utf8'))
  } else {
    console.error('ERROR: No build file.')
    process.exit(1)
  }

  build(bajelfile)
}

main()
