const Task = require('./task.js')
const Graph = require('./graph.js')
const { timestamp, walkDir } = require('./fs_util.js')
const ago = require('./ago.js')
const externalRequire = require
const fs = externalRequire('fs')
// const { pp } = require('passprint')

// jsdoc type-checking only
const Variables = require('./variables.js') // eslint-disable-line no-unused-vars

const fileContent = path => {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch (e) {
    return '' + e
  }
}

module.exports = class {
  /**
   * @param {!Object<string,{deps:?Array<string>, exec:?string, call}|string|Array<String>>} bajelfile
   * @param {{error,warn,log}} tConsole use like built-in console
   */
  constructor (bajelfile, tConsole) {
    /** @private
     * @type {{error,warn,log}}
     */
    this._tConsole = tConsole

    /** @private
     * @type {!Object<string,!Task>}}
     */
    this._tasks = {}

    /**
     * @private
     * @type {!Graph}
     */
    this._graph = new Graph()

    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value === null) {
          throw new Error('Assertion failed')
        }
        this._tasks[key] = new Task(key, value)
        this._tasks[key].addArcs(this._graph)
      }
    }
    /** @private @type {!Array<string>} */
    this._explicitTargets = Object.keys(this._tasks).filter(k => !k.includes('%'))
  }

  /** @returns {!Array<string>} */
  explicitTargets () {
    return this._explicitTargets
  }

  /** @returns {boolean} */
  has (target) {
    return !!this._tasks[target]
  }

  /** @returns {!Task} */
  get (target) {
    return this._tasks[target] || new Task(target, { deps: [], exec: null })
  }

  /** @returns {!Array<string>} */
  targets () {
    return Object.keys(this._tasks)
  }

  /** @private
   * @param {function(!Task)} callback
   */
  _forTask (callback) {
    for (const target in this._tasks) {
      callback(this._tasks[target])
    }
  }

  /** @private */
  _removeAll (toRemove) {
    toRemove.forEach(target => { delete this._tasks[target] })
  }

  /** @private */
  _addAll (toAdd) {
    for (const target in toAdd) {
      if (this._tasks[target]) {
        this._tConsole.warn('Duplicate targets')
        this._tConsole.warn(this._tasks[target].toString())
        this._tConsole.warn(toAdd[target].toString())
      }
      this._tasks[target] = toAdd[target]
    }
  }

  /**
   * @param {!Variables} variables
   */
  expandVariables (variables) {
    const taskNames = Object.keys(this._tasks)
    for (const taskName of taskNames) {
      const task = this._tasks[taskName]
      task.expandVariables(variables)
      if (task.target() !== taskName) {
        delete this._tasks[taskName]
        this._tasks[task.target()] = task
      }
    }
    this._explicitTargets = Object.keys(this._tasks).filter(k => !k.includes('%'))
  }

  /** @param {!Object} tConsole use like built-in console */
  expandDeps (tConsole) {
    const files = []
    walkDir('.', f => { files.push(f) })
    const toAdd = {}
    const toRemove = []
    let expansionHappened = false
    this._forTask(task => {
      const fromPattern = task.removePatternDep()
      if (!fromPattern) {
        if (task.target().includes('%')) {
          throw new Error(
            `Target "${task.target()}" has replacement pattern, but deps have no percents: ${task.toString()}`)
        }
        return
      }
      let matchHappened
      for (const file of [...files, ...this.targets()]) {
        const match = fromPattern.match(file)
        if (match) {
          matchHappened = expansionHappened = true
          toRemove.push(task.target())
          this._graph.remove(task.target())
          const expandedTask = task.expanded(file, match)
          toAdd[expandedTask.target()] = expandedTask
          expandedTask.addArcs(this._graph)
          expandedTask.infiniteLoopCheck(this._graph)
        }
      }
      if (!matchHappened) {
        tConsole.warn(`No match for "${task.target()}"`)
      }
    })
    this._removeAll(toRemove)
    this._addAll(toAdd)
    return expansionHappened
  }

  /**
   * @param {Array<string>} prevTargets
   * @param {string} target being built
   * @param {boolean} dryRun
   * @param {boolean} debug
   * @returns {!Promise<{ code: number, updatedTime: number, recipeHappened:boolean, result:? }>} whether succeeded and timestamp in ms of latest file change
   */
  async recurse (prevTargets, target, dryRun, debug) {
    const debugOut = f => {
      if (debug) {
        this._tConsole.log(`target "${target}" ${f()}`)
      }
    }

    let recipeHappened = false
    const targetTime = await timestamp(target)
    if (!this.has(target) && targetTime === 0) {
      const result = 'is not a file and is not one of the build targets:'
      this._tConsole.warn(target, result, this.targets().sort())
      return { code: 1, updatedTime: -Infinity, recipeHappened, result }
    }
    const task = this.get(target)

    // Check for recursion
    if (prevTargets.includes(target)) {
      throw new Error(`infinite loop ${prevTargets.join(' → ')} → ${target}`)
    }
    prevTargets = [...prevTargets, target]

    let lastDepsTime = 0
    /** @type {!Object<string,?>} */
    const depResults = {}
    for (const dep of task.theDeps()) {
      const {
        code: depCode,
        updatedTime: depTime,
        recipeHappened: depRecipeHappened,
        result: depResult
      } = await this.recurse(prevTargets, dep, dryRun, debug)
      recipeHappened = recipeHappened || depRecipeHappened
      if (depCode !== 0) {
        const result = `-- execution of dep target "${dep}" failed. Stopping.`
        debugOut(() => result)
        return { code: depCode, updatedTime: -Infinity, recipeHappened, result }
      }
      depResults[dep] = depResult
      if (depTime > lastDepsTime) {
        lastDepsTime = depTime
      }
    }

    debugOut(() => `${ago(targetTime)} and its most recent deps ${ago(lastDepsTime)}`)
    /** @type {?} */
    let outResult
    if (task.hasRecipe() && (targetTime === 0 || targetTime < lastDepsTime)) {
      debugOut(() => targetTime === 0
        ? 'does not exist and has a recipe'
        : 'is older than the most recent dep and has a recipe'
      )
      const { callHappened, result } = task.doCall(dryRun, this._tConsole, depResults)
      recipeHappened = recipeHappened || callHappened
      if (callHappened) {
        outResult = result
      } else {
        const code = await task.doExec(dryRun, this._tConsole, depResults)
        recipeHappened = true
        if (code !== 0) {
          this._tConsole.error('FAILED call', task.toString())
          return { code, updatedTime: -Infinity, recipeHappened, result }
        }
      }
    } else {
      debugOut(() => !task.hasRecipe()
        ? 'has no recipe'
        : (lastDepsTime === 0
          ? 'exists and there are no deps so ignoring recipe'
          : 'is more recent than the most recent dep so ignoring recipe'
        )
      )
    }
    if (!outResult) {
      outResult = fileContent(target)
    }
    const updatedTime = Math.max(lastDepsTime, await timestamp(target))
    return { code: 0, updatedTime, recipeHappened, result: outResult }
  }
}
