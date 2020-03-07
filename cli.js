#!/usr/bin/env node

const fs = require('fs')
const build = require('./index.js')
const yaml = require('js-yaml')
const toml = require('toml')

const main = async () => {
  const prefix = process.cwd() + '/build.'

  const readIfExists = suffix => {
    const path = prefix + suffix
    return [
      fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : undefined,
      path
    ]
  }

  const bajelfile = async () => {
    const cjsPath = prefix + 'cjs'
    if (fs.existsSync(cjsPath)) {
      try {
        return require(cjsPath)
      } catch (e) {
        e['Error reading file'] = cjsPath
        throw e
      }
    }
    const mjsPath = prefix + 'mjs'
    if (fs.existsSync(mjsPath)) {
      try {
        return (await import(mjsPath)).default
      } catch (e) {
        e['Error reading file'] = mjsPath
        throw e
      }
    }
    const [yamlText, yamlPath] = readIfExists('yaml')
    if (yamlText) {
      try {
        return yaml.safeLoad(yamlText)
      } catch (e) {
        throw new Error(`${yamlPath}:${e.mark.line}:${e.mark.column} ${e.message}`)
      }
    }
    const [jsonText, jsonPath] = readIfExists('json')
    if (jsonText) {
      try {
        return JSON.parse(jsonText)
      } catch (e) {
        e['Error reading file'] = jsonPath
        throw e
      }
    }
    const [tomlText, tomlPath] = readIfExists('toml')
    if (tomlText) {
      try {
        return toml.parse(tomlText)
      } catch (e) {
        throw new Error(`${tomlPath}:${e.line}:${e.column} ${e.message}`)
      }
    }
    console.error('ERROR: No build file.')
    process.exit(1)
  }

  try {
    build(await bajelfile())
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

main()
