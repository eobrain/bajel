const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const getopts = require('getopts')
const assert = require('assert')
const { Console } = require('console')
const Percent = require('./percent.js')

// const trace = x => console.trace(x) || x

module.exports = async (bajelfile, stdout = process.stdout, stderr = process.stderr) => {
  const theConsole = new Console(stdout, stderr)
  const options = getopts(process.argv.slice(2), {
    boolean: ['n', 'p'],
    alias: {
      n: ['just-print', 'dry-run', 'recon'],
      stopEarly: true
    }
  })
  if (options.help) {
    theConsole.log('usage: bajel [-n] [-p] [target]')
    return true
  }

  const explicitTargets = Object.keys(bajelfile).filter(k => !k.includes('%'))
  if (explicitTargets.length === 0) {
    theConsole.error(`No explicit targets in ${Object.keys(bajelfile)}`)
    return false
  }

  const dryRun = options.n
  const start = options._.length > 0
    ? options._[0]
    : explicitTargets[0]

  const timestamp = path =>
    fs.promises.stat(path)
      .then(s => s.mtimeMs)
      .catch(e => 0)

  const shellTrim = cmd => cmd.split('\n').map(s => s.trim()).join('\n')

  const printAndExec = cmd => new Promise(resolve => {
    const trimmed = shellTrim(cmd.join ? cmd.join(' ') : cmd)
    theConsole.log(trimmed)
    if (dryRun) {
      resolve(true)
      return
    }
    const process = spawn(trimmed, [], { shell: true })
    process.stdout.on('data', data => { theConsole.log(data.toString()) })
    process.stderr.on('data', data => { theConsole.error(data.toString()) })
    process.on('exit', code => {
      if (code !== 0) {
        theConsole.error(`FAILED with code ${code}: \n${trimmed}\n`)
      }
      resolve(code === 0)
    })
  })

  /**
 * @param {string} target being built
 * @returns {[succeeded, number]} whether succeeded and timestamp in ms of latest file change
 * */
  const recurse = async target => {
    const targetTime = await timestamp(target)
    if (!bajelfile[target] && targetTime === 0) {
      theConsole.warn(target,
        'is not a file and is not one of the build targets:',
        Object.keys(bajelfile).sort())
      return [false]
    }
    const task = bajelfile[target] || []
    const deps = strings(task)
    const execs = functions(task)
    assert.strictEqual(deps.length + execs.length, task.length)
    let lastDepsTime = 0
    for (let i = 0; i < deps.length; ++i) {
      const [depSuccess, depTime] = await recurse(deps[i])
      if (!depSuccess) {
        return [depSuccess]
      }
      if (depTime > lastDepsTime) {
        lastDepsTime = depTime
      }
    }
    for (const exec of execs) {
      if (targetTime === 0 || targetTime < lastDepsTime) {
        const source = deps.length > 0 ? deps[0] : '***no-source***'
        const sources = deps.join(' ')
        const success = await printAndExec(exec({ source, sources, target }))
        if (!success) {
          theConsole.error('FAILED  ', target, ':', deps.join(' '))
          return [success]
        }
      }
    }
    const updatedTime = Math.max(lastDepsTime, await timestamp(target))
    return [true, updatedTime]
  }

  // shout out https://medium.com/@allenhwkim/nodejs-walk-directory-f30a2d8f038f
  const walkDir = (dir, callback) => {
    fs.readdirSync(dir).forEach(f => {
      const dirPath = path.join(dir, f)
      if (fs.statSync(dirPath).isDirectory()) {
        walkDir(dirPath, callback)
      } else {
        callback(path.join(dir, f))
      }
    })
  }

  const strings = task => task.filter(x => typeof x === 'string')
  const functions = task => task.filter(x => typeof x === 'function')

  const expandDeps = () => {
    const files = []
    walkDir('.', f => { files.push(f) })
    const toAdd = {}
    const toRemove = []
    let expansionHappened = false
    for (const target in bajelfile) {
      const task = bajelfile[target]
      let from
      for (let i = 0; i < task.length; ++i) {
        if (typeof task[i] === 'string') {
          from = Percent(task[i])
          if (from) {
            task[i] = from
            break
          }
        }
      }
      if (!from) {
        if (target.includes('%')) {
          throw new Error(
            `Target "${target} has replacement pattern, but dependencies have no percents: ${task}`)
        }
        continue
      }
      const deps = strings(task)
      const execs = functions(task)
      let matchHappened
      for (const file of [...files, ...Object.keys(bajelfile)]) {
        const match = from.match(file)
        if (match) {
          const expand = x => {
            if ((typeof x) === 'string') {
              return x.split('%').join(match)
            }
            if (x.length) {
              return x.map(s => s.split('%').join(match))
            }
            throw new Error(
                `In target "${target}:" with percent patterns, expected string or array but got ${typeof s} (${x})`)
          }
          matchHappened = expansionHappened = true
          toRemove.push(target)
          toAdd[expand(target)] = [
            file,
            ...deps.map(expand),
            ...execs.map(exec => c => expand(exec(c)))
          ]
        }
      }
      if (!matchHappened) {
        theConsole.warn(`No match for  ${target}: ${from}`)
      }
    }
    toRemove.forEach(target => { delete bajelfile[target] })
    for (const target in toAdd) {
      if (bajelfile[target]) {
        theConsole.warn('Duplicate targets')
        theConsole.warn(target, ':', bajelfile[target])
        theConsole.warn(target, ':', toAdd[target])
      }
      bajelfile[target] = toAdd[target]
    }
    return expansionHappened
  }

  try {
    while (expandDeps()) {}
  } catch (e) {
    theConsole.error('Problem expanding percents: ' + e)
    return false
  }

  const t0 = Date.now()
  try {
    const [success, ts] = await recurse(start)
    const updated = (ts > t0)

    if (!success) {
      theConsole.error('Execution failed.')
      return false
    }
    if (dryRun) {
      theConsole.log('Dry run finished.')
      return true
    }
    theConsole.log(updated ? 'Execution succeeded.' : 'Up to date.')
    return true
  } catch (e) {
    theConsole.error(e.toString())
    return false
  }
}
