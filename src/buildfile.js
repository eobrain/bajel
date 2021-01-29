const externalRequire = require
const fs = externalRequire('fs')
const markdown = require('./markdown.js')
const yaml = externalRequire('js-yaml')
const toml = externalRequire('toml')
const semver = externalRequire('semver')
// const { pp } = require('passprint')

const yamlLoad = yamlPath => {
  const yamlText = fs.readFileSync(yamlPath, 'utf8')
  if (yamlText) {
    try {
      return yaml.safeLoad(yamlText)
    } catch (e) {
      throw new Error(`${yamlPath}:${e.mark.line}:${e.mark.column} ${e.message}`)
    }
  }
}

const loads = {

  cjs: async cjsPath => {
    try {
      return require(cjsPath)
    } catch (e) {
      e.readingFile = cjsPath
      throw e
    }
  },

  json: async jsonPath => {
    const jsonText = fs.readFileSync(jsonPath, 'utf8')
    if (jsonText) {
      try {
        return JSON.parse(jsonText)
      } catch (e) {
        e.readingFile = jsonPath
        throw e
      }
    }
  },

  md: async mdPath => {
    try {
      return (await markdown(mdPath))
    } catch (e) {
      e.readingFile = mdPath
      throw e
    }
  },

  mjs: async mjsPath => {
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
  },

  toml: async tomlPath => {
    const tomlText = fs.readFileSync(tomlPath, 'utf8')
    if (tomlText) {
      try {
        return toml.parse(tomlText)
      } catch (e) {
        throw new Error(`${tomlPath}:${e.line}:${e.column} ${e.message}`)
      }
    }
  },

  yaml: yamlLoad,
  yml: yamlLoad
}

module.exports = async () => {
  const prefix = process.cwd() + '/BUILD.'
  const prefixAlt = process.cwd() + '/build.'

  const buildFiles = []
  let load
  for (const suffix in loads) {
    const path = prefix + suffix
    if (fs.existsSync(path)) {
      load = loads[suffix]
      buildFiles.push(path)
    }
    const pathAlt = prefixAlt + suffix
    if (fs.existsSync(pathAlt)) {
      load = loads[suffix]
      buildFiles.push(pathAlt)
      console.warn(`Using deprecated file name "${pathAlt}"`)
      console.warn(`         Preferred name is "${path}"`)
    }
  }

  if (buildFiles.length > 1) {
    throw new Error(`Duplicate build files:\n${buildFiles.join('\n')}`)
  }
  if (buildFiles.length === 0) {
    throw new Error('ERROR: No build file.')
  }

  return await load(buildFiles[0])
}
