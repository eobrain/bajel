const externalRequire = require
const readline = externalRequire('readline')
const fs = externalRequire('fs')

const targetPattern = /##\s*(\S+)/
const depsPattern = /Deps: (`.*`)/
const execBeginPattern = /^\s*```(ba)?sh\s*$/
const execEndPattern = /^\s*```\s*$/

module.exports = path => new Promise((resolve, reject) => {
  const bajelfile = {}

  const myInterface = readline.createInterface({
    input: fs.createReadStream(path)
  })

  let lineno = 0
  let target
  let inExec = false
  let execLines = []
  myInterface.on('line', line => {
    lineno++

    if (inExec) {
      if (line.match(execEndPattern)) {
        bajelfile[target].exec = execLines.join('\n')
        inExec = false
        execLines = []
        return
      }
      execLines.push(line)
    }

    const targetMatch = line.match(targetPattern)
    if (targetMatch) {
      target = targetMatch[1]
      bajelfile[target] = {}
      return
    }

    const depsMatch = line.match(depsPattern)
    if (depsMatch) {
      if (!target) {
        reject(new Error(`${path}:${lineno}: Deps without a target:\n${line}`))
        return
      }
      const deps = depsMatch[1] // `foo`, `bar`
      const split = deps.split('`') // ['foo', ', ', 'bar']
      bajelfile[target].deps = split.filter((_, i) => i % 2 === 1)
    }

    if (line.match(execBeginPattern)) {
      if (!target) {
        reject(new Error(`${path}:${lineno}: Exec without a target:\n${line}`))
        return
      }
      execLines = []
      inExec = true
    }
  })
  myInterface.on('close', () => {
    if (Object.keys(bajelfile).length === 0) {
      reject(new Error(`${path} has no targets`))
      return
    }
    resolve(bajelfile)
  })
})
