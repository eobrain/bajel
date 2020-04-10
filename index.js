const { spawn } = require('child_process')
const getopts = require('getopts')
const Percent = require('./percent.js')
const StrConsole = require('./teeconsole.js')
const { timestamp, walkDir } = require('./fs_util.js')

// const trace = x => console.x || x

/**
 * @returns [errorCode, stdoutString, stderrString]
 */
module.exports = async (bajelfile) => {
  const { tConsole, tStdout, tStderr } = StrConsole()
  const options = getopts(process.argv.slice(2), {
    boolean: ['n', 'p', 'd', 'h'],
    alias: {
      n: ['just-print', 'dry-run', 'recon'],
      h: ['help'],
      t: ['targets'],
      T: ['targets-expanded'],
      d: ['debug'],
      stopEarly: true
    }
  })
  if (options.help) {
    tConsole.log(`
       usage: bajel[-n][-p][-h][target]
       -n  dry run
       -p  print out the expanded build file
       -d  debug
       -t  print out all explicit targets before % expansion
       -T  print out all targets after % expansion
       -h  this help
       `)
    return [0, tStdout(), tStderr()]
  }

  const explicitTargets = Object.keys(bajelfile).filter(k => !k.includes('%'))
  if (explicitTargets.length === 0) {
    const targetsStr = JSON.stringify(Object.keys(bajelfile))
    tConsole.error(`No explicit targets in ${targetsStr}`)
    return [1, tStdout(), tStderr()]
  }

  if (options.t) {
    tConsole.log(explicitTargets.join(' '))
    return [0, tStdout(), tStderr()]
  }

  const dryRun = options.n
  const start = options._.length > 0
    ? options._[0]
    : explicitTargets[0]

  const shellTrim = cmd => cmd.split('\n').map(s => s.trim()).join('\n')

  const printAndExec = cmd => new Promise(resolve => {
    const trimmed = shellTrim(cmd)
    tConsole.log(trimmed)
    if (dryRun) {
      resolve(0)
      return
    }
    const process = spawn(trimmed, [], { shell: true })
    process.stdout.on('data', data => { tConsole.log(data.toString()) })
    process.stderr.on('data', data => { tConsole.error(data.toString()) })
    process.on('exit', code => {
      if (code !== 0) {
        tConsole.error(`FAILED with code ${code}: \n${trimmed}\n`)
      }
      resolve(code)
    })
  })

  /**
 * @param {string} target being built
 * @returns {[errorCode, number, recipeHappened]} whether succeeded and timestamp in ms of latest file change
 * */
  const recurse = async (prevTargets, target) => {
    const debugOut = f => {
      if (options.debug) {
        tConsole.log(`target "${target}" ${f()}`)
      }
    }

    let recipeHappened = false
    const targetTime = await timestamp(target)
    if (!bajelfile[target] && targetTime === 0) {
      tConsole.warn(target,
        'is not a file and is not one of the build targets:',
        Object.keys(bajelfile).sort())
      return [1]
    }
    const task = bajelfile[target] || {}

    // Check for recursion
    if (prevTargets.includes(target)) {
      throw new Error(`infinite loop ${prevTargets.join(' → ')} → ${target}`)
    }
    prevTargets = [...prevTargets, target]

    const deps = task.deps || []
    const exec = task.exec
    const call = task.call
    let lastDepsTime = 0
    for (let i = 0; i < deps.length; ++i) {
      const [depCode, depTime, depRecipeHappened] = await recurse(prevTargets, deps[i])
      recipeHappened = recipeHappened || depRecipeHappened
      if (depCode !== 0) {
        debugOut(() => `-- execution of dep target "${deps[i]}" failed. Stopping.`)
        return [depCode]
      }
      if (depTime > lastDepsTime) {
        lastDepsTime = depTime
      }
    }

    debugOut(() => `${ago(targetTime)} and its most recent deps ${ago(lastDepsTime)}`)
    const hasRecipe = exec || call
    if (hasRecipe && (targetTime === 0 || targetTime < lastDepsTime)) {
      debugOut(() => targetTime === 0
        ? 'does not exist and has a recipe'
        : 'is older than the most recent dep and has a recipe'
      )
      const source = deps.length > 0 ? deps[0] : '***no-source***'
      const sources = deps.join(' ')
      if (call) {
        const echo = tConsole.log
        call({ target, source, sources, echo })
        recipeHappened = true
      } else {
        // exec
        if (!exec.replace) {
          throw new TypeError(`exec of target "${target}" should be a string`)
        }
        const substitutedExec = exec
          .replace(/\$@/g, target)
          .replace(/\$</g, source)
          .replace(/\$\+/g, sources)
        const code = await printAndExec(substitutedExec)
        recipeHappened = true
        if (code !== 0) {
          tConsole.error('FAILED  ', target, ':', deps.join(' '))
          return [code]
        }
      }
    } else {
      debugOut(() => !hasRecipe
        ? 'has no recipe'
        : (lastDepsTime === 0
          ? 'exists and there are no deps so ignoring recipe'
          : 'is more recent than the most recent dep so ignoring reccipe'
        )
      )
    }
    const updatedTime = Math.max(lastDepsTime, await timestamp(target))
    return [0, updatedTime, recipeHappened]
  }

  const expandDeps = () => {
    const files = []
    walkDir('.', f => { files.push(f) })
    const toAdd = {}
    const toRemove = []
    let expansionHappened = false
    for (const target in bajelfile) {
      // console.log('target=', target)
      const task = bajelfile[target]
      let deps = task.deps || []
      if (!deps.filter) {
        throw new Error('Deps should be an array in\n"' + target + '":' + JSON.stringify(task, null, 1))
      }
      let from
      for (let i = 0; i < deps.length; ++i) {
        from = Percent(deps[i])
        if (from) {
          delete deps[i]
          break
        }
      }
      deps = deps.filter(d => d)
      if (!from) {
        if (target.includes('%')) {
          throw new Error(
            `Target "${target}" has replacement pattern, but dependencies have no percents: ${JSON.stringify(deps)}`)
        }
        continue
      }
      let matchHappened
      for (const file of [...files, ...Object.keys(bajelfile)]) {
        const match = from.match(file)
        if (match) {
          // console.log(`${from}.match(${file}) --> ${match}`)
          const expand = x => x.split('%').join(match)
          const expandedTarget = expand(target)
          // console.log('expandedTarget=', expandedTarget)
          /* if (bajelfile[expandedTarget]) {
            tConsole.warn('Recursion')
            tConsole.warn(`"${target}": ${JSON.stringify(bajelfile[target])}`)
            tConsole.warn(`"${target}": ${JSON.stringify(toAdd[target])}`)
            continue
          } */
          matchHappened = expansionHappened = true
          toRemove.push(target)
          const expandedTask = {}
          if (deps) {
            expandedTask.deps = [file, ...deps.map(expand)]
          }
          for (const expandedDep of expandedTask.deps) {
            if (!expandedDep.match(/%/) && bajelfile[expandedDep]) {
              throw new Error(
                `infinite loop after expansion ${expandedTarget} → ${expandedDep}`)
            }
          }
          if (task.exec) {
            expandedTask.exec = expand(task.exec)
          }
          if (task.call) {
            expandedTask.call = $ => task.call({ ...$, match })
          }
          toAdd[expand(target)] = expandedTask
        }
      }
      if (!matchHappened) {
        tConsole.warn(`No match for "${target}"`)
      }
    }
    toRemove.forEach(target => { delete bajelfile[target] })
    for (const target in toAdd) {
      if (bajelfile[target]) {
        tConsole.warn('Duplicate targets')
        tConsole.warn(`"${target}": ${JSON.stringify(bajelfile[target])}`)
        tConsole.warn(`"${target}": ${JSON.stringify(toAdd[target])}`)
      }
      bajelfile[target] = toAdd[target]
    }
    return expansionHappened
  }

  try {
    while (expandDeps()) { }
  } catch (e) {
    tConsole.error('Problem expanding percents: ' + e)
    if (options.p) {
      tConsole.log(bajelfile)
    }
    return [1, tStdout(), tStderr()]
  }
  if (options.T) {
    tConsole.log(Object.keys(bajelfile).join(' '))
    return [0, tStdout(), tStderr()]
  }
  if (options.p) {
    tConsole.log(bajelfile)
    return [0, tStdout(), tStderr()]
  }

  const t0 = Date.now()

  const ago = (t) => {
    if (t === 0) {
      return 'does not exist'
    }
    const ms = t0 - t
    if (ms < 1000) {
      return `modified ${ms.toPrecision(3)}ms ago`
    }
    const s = ms / 1000
    if (s < 60) {
      return `modified ${s.toPrecision(3)}s ago`
    }
    const min = s / 60
    if (min < 60) {
      return `modified ${min.toPrecision(3)} min ago`
    }
    const hour = min / 60
    if (hour < 24) {
      return `modified ${hour.toPrecision(3)} hours ago`
    }
    const day = hour / 24
    return `modified ${day.toPrecision(3)} days ago`
  }

  try {
    const [code, ts, recipeHappened] = await recurse([], start)

    if (code !== 0) {
      tConsole.error(`bajel: recipe for target '${start}' failed\nbajel: *** [error] Error ${code}`)
      return [code, tStdout(), tStderr()]
    }
    if (dryRun) {
      return [0, tStdout(), tStderr()]
    }
    const phony = (await timestamp(start) === 0)
    if (phony && !recipeHappened) {
      tConsole.log(`bajel: Nothing to be done for "${start}".`)
    }
    if (!phony && !recipeHappened) {
      tConsole.log(`bajel: '${start}' is up to date. (${ago(ts)})`)
    }
    return [0, tStdout(), tStderr()]
  } catch (e) {
    tConsole.error(e.toString())
    return [1, tStdout(), tStderr()]
  }
}
