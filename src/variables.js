
class Variables {
  /**
   * @param {!Object} bajelfile
   */
  constructor (bajelfile) {
    /** @private @type {!Object} */
    this._dict = {}
    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value !== 'object' || Array.isArray(value)) {
        this._dict[key] = value
      }
    }
  }

  /**
   * @param {string} string
   * @param {!Object} prev={}
   * @return {string}
   */
  interpolation (string, prev = {}) {
    return string.replace(/\$\((\w+)\)/g, (_, variableName) => {
      if (prev[variableName]) {
        throw new Error(`Recursive definition of ${variableName}.`)
      }
      const value = this._dict[variableName]
      if (value === undefined) {
        throw new Error(`Variable ${variableName} is not defined.`)
      }
      const asString = Array.isArray(value) ? value.join(' ') : value
      return this.interpolation(asString, { [variableName]: true, ...prev })
    })
  }

  /**
   * @param {string} string
   * @param {!Object} prev={}
   * @return {string}
   */
  interpolationAsArray (string, prev = {}) {
    string = string.trim()
    if (!string.match(/^\$\((\w+)\)$/)) {
      throw new Error(`"${string}" should be an array or a variable reference`)
    }
    const variableName = string.slice(2, -1)
    const value = this._dict[variableName]
    if (value === undefined) {
      throw new Error(`Variable ${variableName} is not defined. Current variables are ${JSON.stringify(this._dict, undefined, 2)}.`)
    }
    return value
  }
}

module.exports = Variables
