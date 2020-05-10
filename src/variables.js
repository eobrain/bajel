module.exports = class {
  constructor (bajelfile) {
    this._dict = {}
    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value !== 'object' || Array.isArray(value)) {
        this._dict[key] = value
      }
    }
  }

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
}
