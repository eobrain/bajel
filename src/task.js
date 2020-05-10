module.exports = class {
  constructor (target, { deps, exec, call }) {
    this._target = target
    this.deps = deps
    this.exec = exec
    this.call = call
  }

  toString () {
    const propertyStrings = []
    if (this.deps) {
      propertyStrings.push(`deps:${JSON.stringify(this.deps)}`)
    }
    if (this.exec) {
      propertyStrings.push(`exec:${JSON.stringify(this.exec)}`)
    }
    if (this.call) {
      propertyStrings.push(`call:${this.call}`)
    }
    return `${this._target}:{${propertyStrings.join()}}`
  }

  target () {
    return this._target
  }
}
