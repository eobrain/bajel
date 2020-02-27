import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import getopts from 'getopts'

(async () => {
  const bajelfile = await import(`${process.cwd()}/bajelfile.js`)

  const options = getopts(process.argv.slice(2), {
    boolean: ['n'],
    alias: {
      n: ['just-print', 'dry-run', 'recon'],
      stopEarly: true
    }
  })
  if (options.help) {
    console.log('usage: bajel [-n] [target]')
    process.exit(0)
  }
  const dryRun = options.n
  const start = options._.length > 0
    ? options._[0]
    : Object.keys(bajelfile)[0]

  const timestamp = path =>
    fs.promises.stat(path)
      .then(s => s.mtimeMs)
      .catch(e => 0)

  const ago = (t) => {
    if (t === 0) {
      return 'missing'
    }
    const ms = Date.now() - t
    if (ms < 1000) {
      return `${ms.toPrecision(3)}ms ago`
    }
    const s = ms / 1000
    if (s < 60) {
      return `${s.toPrecision(3)}s ago`
    }
    const min = s / 60
    if (min < 60) {
      return `${min.toPrecision(3)} min ago`
    }
    const hour = min / 60
    if (hour < 24) {
      return `${hour.toPrecision(3)} hours ago`
    }
    const day = hour / 24
    return `${day.toPrecision(3)} days ago`
  }

  const shellTrim = cmd => cmd.split('\n').map(s => s.trim()).join('\n')

  const printAndExec = cmd => new Promise(resolve => {
    const trimmed = shellTrim(cmd)
    console.log(trimmed)
    if (dryRun) {
      resolve(true)
      return
    }
    const process = spawn(trimmed, [], { shell: true })
    process.stdout.on('data', data => { console.log(data.toString()) })
    process.stderr.on('data', data => { console.error(data.toString()) })
    process.on('exit', code => {
      if (code !== 0) {
        console.error(`FAILED with code ${code}: \n${trimmed}\n`)
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
    const task = bajelfile[target] || {}
    if (!task.exec && !task.deps && targetTime === 0) {
      console.warn(`No target "${target}"`)
      return [false]
    }
    const deps = task.deps || []
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
    if (task.exec) {
      if (targetTime === 0 || targetTime < lastDepsTime) {
        const source = deps.length > 0 ? deps[0] : '***no-source***'
        const success = await printAndExec(task.exec({ source, target }))
        if (!success) {
          console.error('FAILED', task)
          return [success]
        }
      }
    }
    const updatedTime = Math.max(lastDepsTime, await timestamp(target))
    return [true, updatedTime]
  }

  // shoutout https://medium.com/@allenhwkim/nodejs-walk-directory-f30a2d8f038f
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

  const expandDeps = () => {
    const files = []
    walkDir('.', f => { files.push(f) })
    const toAdd = {}
    const toRemove = []
    let expansionHappened = false
    for (const target in bajelfile) {
      const task = bajelfile[target]
      if (!task.from) {
        continue
      }
      const deps = task.deps || []
      let matchHappened
      for (const file of [...files, ...Object.keys(bajelfile)]) {
        const match = file.match(task.from)
        if (match) {
          const group = match[1]
          const expand = s => s.split('$1').join(group)
          matchHappened = expansionHappened = true
          toRemove.push(target)
          toAdd[expand(target)] = {
            deps: [file, ...deps.map(expand)],
            exec: c => expand(task.exec(c))
          }
        }
      }
      if (!matchHappened) {
        console.warn(`No match for  ${target}: ${task.from}`)
      }
    }
    toRemove.forEach(target => { delete bajelfile[target] })
    for (const target in toAdd) {
      if (bajelfile[target]) {
        console.warn('Duplicate targets')
        console.warn(target, ':', bajelfile[target])
        console.warn(target, ':', toAdd[target])
      }
      bajelfile[target] = toAdd[target]
    }
    return expansionHappened
  }

  const main = async () => {
    while (expandDeps()) {}
    const [success, timestamp] = await recurse(start)

    if (!success) {
      console.error('Execution failed.')
      process.exit(1)
    }
    if (dryRun) {
      console.log('Dry run finished.')
      process.exit(0)
    }
    console.log('Execution succeeded.')
    if (timestamp) {
      console.log('Latest file modified ', ago(timestamp))
    }
    process.exit(0)
  }

  main()
})()
