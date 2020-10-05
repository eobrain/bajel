const globby = require('globby')
// const pp = require('passprint')

const GLOBBY_OPTIONS = {
  expandDirectories: false
}

/**
   * @param {!Object} bajelfile
   */
const Variables = async bajelfile => {
  /** @private @type {!Object} */
  const _dict = {}
  for (const key in bajelfile) {
    const value = bajelfile[key]
    if (typeof value !== 'object') {
      _dict[key] = value
    }
    if (Array.isArray(value)) {
      if (value.some(s => s.match(/\*/))) {
        _dict[key] = await globby(value, GLOBBY_OPTIONS)
      } else {
        _dict[key] = value
      }
    }
  }

  /**
   * @param {string} string
   * @param {!Object} prev={}
   * @return {string}
   */
  const interpolation = (string, prev = {}) => {
    return string.replace(/\$\((\w+)\)/g, (_, variableName) => {
      if (prev[variableName]) {
        throw new Error(`Recursive definition of ${variableName}.`)
      }
      const value = _dict[variableName]
      if (value === undefined) {
        throw new Error(`Variable ${variableName} is not defined.`)
      }
      const asString = Array.isArray(value) ? value.join(' ') : value
      return interpolation(asString, { [variableName]: true, ...prev })
    })
  }

  /**
   * @param {string} string
   * @param {!Object} prev={}
   * @return {array}
   */
  const interpolationAsArray = (string, prev = {}) => {
    string = string.trim()
    if (!string.match(/^\$\((\w+)\)$/)) {
      throw new Error(`"${string}" should be an array or a variable reference`)
    }
    const variableName = string.slice(2, -1)
    const value = _dict[variableName]
    if (value === undefined) {
      throw new Error(`Variable ${variableName} is not defined.`)
    }
    return value
  }

  return { interpolation, interpolationAsArray }
}

module.exports = Variables
