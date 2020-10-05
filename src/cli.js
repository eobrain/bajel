#!/usr/bin/env node

const externalRequire = require
const fs = externalRequire('fs')
const build = require('./index.js')
const markdown = require('./markdown.js')
const yaml = externalRequire('js-yaml')
const toml = externalRequire('toml')
const semver = externalRequire('semver')
// const { pp } = require('passprint')

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
        e.readingFile = cjsPath
        throw e
      }
    }
    const mjsPath = prefix + 'mjs'
    if (fs.existsSync(mjsPath)) {
      const VERSION_REQUIREMENT = '>=13.2.0'
      if (!semver.satisfies(process.version, VERSION_REQUIREMENT)) {
        throw new Error(`Need Node ${VERSION_REQUIREMENT} to use .mjs files (ES6 modules). Current version is ${process.version}.`)
      }

      try {
        return (await import(mjsPath)).default
      } catch (e) {
        e.readingFile = mjsPath
        throw e
      }
    }
    const mdPath = prefix + 'md'
    if (fs.existsSync(mdPath)) {
      try {
        return (await markdown(mdPath))
      } catch (e) {
        e.readingFile = mdPath
        throw e
      }
    }
    let [yamlText, yamlPath] = readIfExists('yaml')
    if (!yamlText) {
      [yamlText, yamlPath] = readIfExists('yml')
    }
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
        e.readingFile = jsonPath
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
    throw new Error('ERROR: No build file.')
  }

  try {
    const [code] = await build(await bajelfile())
    return code
  } catch (e) {
    const fileMessage = e.readingFile ? ` reading file ${e.readingFile}` : ''
    console.error(`ERROR${fileMessage}: ${e.message}`)
    return 1
  }
}

module.exports = main // for testing

main().then(code => process.exit(code))
