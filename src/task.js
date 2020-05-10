const fs = require('fs')
const Percent = require('./percent.js')
class Task {
  constructor (target, { deps, exec, call }) {
    this._target = target
    this.deps = deps
    this.exec = exec
    this._call = call
  }

  toString () {
    const propertyStrings = []
    if (this.deps) {
      propertyStrings.push(`deps:${JSON.stringify(this.deps)}`)
    }
    if (this.exec) {
      propertyStrings.push(`exec:${JSON.stringify(this.exec)}`)
    }
    if (this._call) {
      propertyStrings.push(`call:${this._call}`)
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
    if (this._call) {
      object.call = $ => this._call({ ...$, match })
    }
    return new Task(expandedTarget, object)
  }

  removePatternDep () {
    if (this.deps === null || this.deps === undefined) {
      return undefined
    }
    if (!this.deps.filter) {
      throw new Error('Deps should be an array in\n' + this.toString())
    }
    for (let i = 0; i < this.deps.length; ++i) {
      const fromPattern = Percent(this.deps[i])
      if (fromPattern) {
        delete this.deps[i]
        this.deps = this.deps.filter(d => d)
        return fromPattern
      }
    }
    return undefined
  }

  infiniteLoopCheck (alreadyDefined) {
    for (const expandedDep of this.deps) {
      if (!expandedDep.match(/%/) && alreadyDefined(expandedDep)) {
        throw new Error(
            `infinite loop after expansion ${this.target()} → ${expandedDep}`)
      }
    }
  }

  * theDeps () {
    const deps = this.deps || []
    for (let i = 0; i < deps.length; ++i) {
      yield deps[i]
    }
  }

  hasRecipe () {
    return !!this.exec || !!this._call
  }

  doCall (target, source, sources, tConsole) {
    if (!this._call) {
      return false
    }
    const echo = tConsole.log
    tConsole.log(`calling function: ${sources} --> ${target}`)
    this._call({
      target: { path: target, write: s => fs.writeFileSync(target, s) },
      source: { path: source, read: () => fs.readFileSync(source) },
      sources: (this.deps || []).map(p => ({ path: p, read: () => fs.readFileSync(p) })),
      echo
    })
    return true
  }
}

module.exports = Task
