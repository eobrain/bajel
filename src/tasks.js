const Task = require('./task.js')
const { walkDir } = require('./fs_util.js')

module.exports = class {
  constructor (bajelfile, tConsole) {
    this._tConsole = tConsole
    this._dict = {}
    for (const key in bajelfile) {
      const value = bajelfile[key]
      if (typeof value === 'object' && !Array.isArray(value)) {
        this._dict[key] = new Task(key, value)
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
    return this._dict[target] || new Task({}, this._tConsole)
  }

  targets () {
    return Object.keys(this._dict)
  }

  _forTask (callback) {
    for (const target in this._dict) {
      callback(this._dict[target])
    }
  }

  _removeAll (toRemove) {
    toRemove.forEach(target => { delete this._dict[target] })
  }

  _addAll (toAdd) {
    for (const target in toAdd) {
      if (this._dict[target]) {
        this._tConsole.warn('Duplicate targets')
        this._tConsole.warn(this._dict[target].toString())
        this._tConsole.warn(toAdd[target].toString())
      }
      this._dict[target] = toAdd[target]
    }
  }

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
          const expand = x => x.split('%').join(match)
          matchHappened = expansionHappened = true
          toRemove.push(task.target())
          const expandedTask = task.expanded(file, match, expand)
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
}
