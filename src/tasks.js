const Task = require('./task.js')
const { timestamp, walkDir } = require('./fs_util.js')
const ago = require('./ago.js')

module.exports = class {
  /**
   * @param {!Object} bajelfile
   * @param {!Object} tConsole use like built-in console
   */
  constructor (bajelfile, tConsole) {
    this._tConsole = tConsole
    this._tasks = {}
    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value === null) {
          throw new Error('Assertion failed')
        }
        this._tasks[key] = new Task(key, value)
      }
    }
    /** @type {!Array<string>} */
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
    return this._tasks[target] || new Task(target, {})
  }

  /** @returns {!Array<string>} */
  targets () {
    return Object.keys(this._tasks)
  }

  /** @private */
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
          const expandedTask = task.expanded(file, match)
          expandedTask.infiniteLoopCheck(target => this.has(target))
          toAdd[expandedTask.target()] = expandedTask
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
   * @param {string} target being built
   * @returns {!Promise<!Array>} [errorCode, number, recipeHappened] whether succeeded and timestamp in ms of latest file change
   */
  async recurse (prevTargets, target, variables, dryRun, debug) {
    const debugOut = f => {
      if (debug) {
        this._tConsole.log(`target "${target}" ${f()}`)
      }
    }

    let recipeHappened = false
    const targetTime = await timestamp(target)
    if (!this.has(target) && targetTime === 0) {
      this._tConsole.warn(target,
        'is not a file and is not one of the build targets:',
        this.targets().sort())
      return [1]
    }
    const task = this.get(target)

    // Check for recursion
    if (prevTargets.includes(target)) {
      throw new Error(`infinite loop ${prevTargets.join(' → ')} → ${target}`)
    }
    prevTargets = [...prevTargets, target]

    let lastDepsTime = 0
    for (const dep of task.theDeps()) {
      const [depCode, depTime, depRecipeHappened] = await this.recurse(prevTargets, dep, variables, dryRun, debug)
      recipeHappened = recipeHappened || depRecipeHappened
      if (depCode !== 0) {
        debugOut(() => `-- execution of dep target "${dep}" failed. Stopping.`)
        return [depCode]
      }
      if (depTime > lastDepsTime) {
        lastDepsTime = depTime
      }
    }

    debugOut(() => `${ago(targetTime)} and its most recent deps ${ago(lastDepsTime)}`)
    if (task.hasRecipe() && (targetTime === 0 || targetTime < lastDepsTime)) {
      debugOut(() => targetTime === 0
        ? 'does not exist and has a recipe'
        : 'is older than the most recent dep and has a recipe'
      )
      const callHappened = task.doCall(dryRun, this._tConsole)
      recipeHappened = recipeHappened || callHappened
      if (!callHappened) {
        const code = await task.doExec(variables, dryRun, this._tConsole)
        recipeHappened = true
        if (code !== 0) {
          this._tConsole.error('FAILED call', task.toString())
          return [code]
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
    const updatedTime = Math.max(lastDepsTime, await timestamp(target))
    return [0, updatedTime, recipeHappened]
  }
}
