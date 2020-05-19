
module.exports = class {
  constructor (pattern) {
    const fixes = pattern.split('%')

    if (fixes.length > 2) {
      throw new Error(`Too many percents in "${pattern}`)
    }
    /** @private  */
    this._hasMatch = (fixes.length === 2)
    if (this._hasMatch) {
    /** @private  */
      [this._prefix, this._suffix] = fixes
    }
  }

  /** @return {string} */
  toString () {
    return `Pattern{["${this._prefix}","${this._suffix}"]}`
  }

  /** @return {boolean} */
  hasMatch () {
    return this._hasMatch
  }

  /**
   * @param {string} s
   * @returns {string|undefined}
   */
  match (s) {
    if (s.length <= this._prefix.length + this._suffix.length) {
      return undefined
    }
    if (s.startsWith(this._prefix) && s.endsWith(this._suffix)) {
      return s.substring(this._prefix.length, s.length - this._suffix.length)
    }
    return undefined
  }
}
