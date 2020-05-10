module.exports = class {
  constructor (bajelfile, tConsole) {
    this._tConsole = tConsole
    this._dict = {}
    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value === 'object' && !Array.isArray(value)) {
        this._dict[key] = value
      }
    }
    this._explicitTargets = Object.keys(this._dict).filter(k => !k.includes('%'))
  }

  explicitTargets () {
    return this._explicitTargets
  }

  has (target) {
    return !!this._dict[target]
  }

  get (target) {
    return this._dict[target] || {}
  }

  targets () {
    return Object.keys(this._dict)
  }

  forTask (callback) {
    for (const target in this._dict) {
      callback(target, this._dict[target])
    }
  }

  removeAll (toRemove) {
    toRemove.forEach(target => { delete this._dict[target] })
  }

  addAll (toAdd) {
    for (const target in toAdd) {
      if (this._dict[target]) {
        this._tConsole.warn('Duplicate targets')
        this._tConsole.warn(`"${target}": ${JSON.stringify(this._dict[target])}`)
        this._tConsole.warn(`"${target}": ${JSON.stringify(toAdd[target])}`)
      }
      this._dict[target] = toAdd[target]
    }
  }
}
