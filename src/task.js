const externalRequire = require
const fs = externalRequire('fs')
const Percent = require('./percent.js')
const printAndExec = require('./exec.js')

class Task {
  /**
   * @param {string} target
   * @param {!{ deps:?Array<string>, exec:?string, call }} task
   */
  constructor (target, { deps, exec, call }) {
    this._target = target
    this._deps = deps
    this._exec = exec
    this._call = call
  }

  /** @returns {string} */
  toString () {
    const propertyStrings = []
    if (this._deps) {
      propertyStrings.push(`deps:${JSON.stringify(this._deps)}`)
    }
    if (this._exec) {
      propertyStrings.push(`exec:${JSON.stringify(this._exec)}`)
    }
    if (this._call) {
      propertyStrings.push(`call:${this._call}`)
    }
    return `${this._target}:{${propertyStrings.join()}}`
  }

  /** @returns {string} */
  target () {
    return this._target
  }

  /**
   * @param {string} file
   * @param {string} match
   * @returns {!Task}
   */
  expanded (file, match) {
    const expand = x => x.split('%').join(match)
    const expandedTarget = expand(this._target)
    const object = { }
    if (this._deps) {
      object.deps = [file, ...this._deps.map(expand)].filter(x => x)
    }
    if (this._exec) {
      object.exec = expand(this._exec)
    }
    if (this._call) {
      object.call = $ => this._call({ ...$, match })
    }
    return new Task(expandedTarget, object)
  }

  /** @returns {Percent|undefined} */
  removePatternDep () {
    if (this._deps === null || this._deps === undefined) {
      return undefined
    }
    if (!this._deps.filter) {
      throw new Error('Deps should be an array in\n' + this.toString())
    }
    for (let i = 0; i < this._deps.length; ++i) {
      const fromPattern = new Percent(this._deps[i])
      if (fromPattern.hasMatch()) {
        delete this._deps[i]
        this._deps = this._deps.filter(d => d)
        return fromPattern
      }
    }
    return undefined
  }

  infiniteLoopCheck (alreadyDefined) {
    const deps = this._deps || []
    for (const expandedDep of deps) {
      if (!expandedDep.match(/%/) && alreadyDefined(expandedDep)) {
        throw new Error(
            `infinite loop after expansion ${this.target()} → ${expandedDep}`)
      }
    }
  }

  * theDeps () {
    const deps = this._deps || []
    for (let i = 0; i < deps.length; ++i) {
      yield deps[i]
    }
  }

  hasRecipe () {
    return !!this._exec || !!this._call
  }

  doCall (dryRun, tConsole) {
    if (!this._call) {
      return false
    }
    const deps = this._deps || []
    const source = deps.length > 0 ? deps[0] : '***no-source***'
    const sources = deps.join(' ')

    const echo = tConsole.log
    tConsole.log(`calling function: ${sources} --> ${this._target}`)
    if (dryRun) {
      return true
    }
    this._call({
      target: { path: this._target, write: s => fs.writeFileSync(this._target, s) },
      source: { path: source, read: () => fs.readFileSync(source) },
      sources: deps.map(p => ({ path: p, read: () => fs.readFileSync(p) })),
      echo
    })
    return true
  }

  async doExec (variables, dryRun, tConsole) {
    if (!this._exec.replace) {
      throw new TypeError(`exec of target "${this._target}" should be a string`)
    }
    const deps = this._deps || []
    const source = deps.length > 0 ? deps[0] : '***no-source***'
    const sources = deps.join(' ')

    const substitutedExec = variables.interpolation(
      this._exec
        .replace(/\$@/g, this._target)
        .replace(/\$</g, source)
        .replace(/\$\+/g, sources)
    )
    return printAndExec(substitutedExec, dryRun, tConsole)
  }
}

module.exports = Task
