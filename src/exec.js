const externalRequire = require
const { spawn } = externalRequire('child_process')

const shellTrim = cmd => cmd.split('\n').map(s => s.trim()).join('\n')

module.exports = (cmd, dryRun, tConsole) => new Promise(resolve => {
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
