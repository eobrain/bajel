class Task {
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

  expanded (file, match, expand) {
    const expandedTarget = expand(this._target)
    const object = { }
    if (this.deps) {
      object.deps = [file, ...this.deps.map(expand)].filter(x => x)
    }
    if (this.exec) {
      object.exec = expand(this.exec)
    }
    if (this.call) {
      object.call = $ => this.call({ ...$, match })
    }
    return new Task(expandedTarget, object)
  }
}

module.exports = Task
