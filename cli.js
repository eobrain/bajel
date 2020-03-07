#!/usr/bin/env node

const fs = require('fs')
const build = require('./index.js')

const prefix = process.cwd() + '/build.'

if (fs.existsSync(prefix + 'cjs')) {
  require(prefix + 'cjs')
} else if (fs.existsSync(prefix + 'json')) {
  build(JSON.parse(fs.readFileSync(prefix + 'json', 'utf8')))
} else {
  console.error('ERROR: No build file.')
}
