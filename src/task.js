const Percent = require('./percent.js')
const printAndExec = require('./exec.js')
const { writeTmp } = require('./fs_util.js')
// const { pp } = require('passprint')

// jsdoc type-checking only
const Variables = require('./variables.js') // eslint-disable-line no-unused-vars
const Graph = require('./graph.js') // eslint-disable-line no-unused-vars

class Task {
  /**
   * @param {string} target
   * @param {!{ deps:(?Array<string>|string), exec:?string, call }} task
   */
  constructor (target, { deps, exec, call }) {
    this._target = target
    this._deps = deps
    this._exec = exec
    this._call = call
  }

  /**
   * @param {!Variables} variables
   */
  expandVariables (variables) {
    this._target = variables.interpolation(this._target)
    if (this._deps) {
      if (this._deps.map) {
        // deps is array
        this._deps = this._deps.map(dep => variables.interpolation(dep))
      } else {
        // deps is variable
        this._deps = variables.interpolationAsArray(/** @type {string} */(this._deps))
      }
    }
    if (this._exec && this._exec.replace) {
      this._exec = variables.interpolation(this._exec)
    }
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
    object.call = this._call
    return new Task(expandedTarget, object)
  }

  /** @returns {Percent|undefined} */
  removePatternDep () {
    if (this._deps === null || this._deps === undefined) {
      return undefined
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

  /**
   * @param {!Graph} graph
   */
  infiniteLoopCheck (graph) {
    const loop = graph.findLoop(this._target)
    if (loop) {
      throw new Error(`infinite loop after expansion ${loop}`)
    }
  }

  * theDeps () {
    const deps = this._deps || []
    for (let i = 0; i < deps.length; ++i) {
      yield deps[i]
    }
  }

  hasDeps () {
    return this._deps && this._deps.length > 0
  }

  /**
   * @param {!Graph} graph
   */
  addArcs (graph) {
    for (const dep of this.theDeps()) {
      graph.arc(this._target, dep)
    }
  }

  hasRecipe () {
    return !!this._exec || !!this._call
  }

  /**
   * @param {boolean} dryRun
   * @param {!Object} tConsole
   * @param {!Object<string,?>} depResults
   * @return {{callHappened: boolean, result: ?}}
   */
  doCall (dryRun, tConsole, depResults) {
    if (!this._call) {
      return { callHappened: false, result: '** no call **' }
    }
    tConsole.log(`calling function: --> ${this._target}`)
    if (dryRun) {
      return { callHappened: true, result: '** dry run **' }
    }
    const deps = this._deps || []
    /** @type {Object.<string, string>} */
    const iterableDepResults = deps.map(dep => depResults[dep])
    deps.forEach((dep, i) => {
      if (depResults[dep]) {
        iterableDepResults[dep] = depResults[dep]
      }
    })
    return { callHappened: true, result: this._call(iterableDepResults) }
  }

  /**
   * @param {boolean} dryRun
   * @param {!Object} tConsole
   * @param {!Object<string,?>} depResults
   * @returns {!Promise<number>}
   */
  async doExec (dryRun, tConsole, depResults) {
    if (!this._exec.replace) {
      throw new TypeError(`exec of target "${this._target}" should be a string`)
    }
    const deps = this._deps || []
    const source = deps.length > 0 ? deps[0] : '***no-source***'
    const sources = deps.join(' ')
    let exec = this._exec
      .replace(/\$@/g, this._target)
      .replace(/\$</g, source)
      .replace(/\$\+/g, sources)
    deps.forEach((dep, i) => {
      const depResult = depResults[dep]
      if (depResult) {
        const regexp = new RegExp(`\\$${i}`, 'g')
        if (exec.match(regexp)) {
          const tmpPath = writeTmp(depResult)
          exec = exec.replace(regexp, tmpPath)
        }
      }
    })
    return printAndExec(exec, dryRun, tConsole)
  }
}

module.exports = Task
