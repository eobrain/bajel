const externalRequire = require

const getopts = externalRequire('getopts')
const StrConsole = require('./teeconsole.js')
const { timestamp } = require('./fs_util.js')
const Variables = require('./variables.js')
const Tasks = require('./tasks.js')
const ago = require('./ago.js')
// const { pp } = require('passprint')

// const trace = x => console.log('trace:', x) || x

/**
 * @returns [errorCode, stdoutString, stderrString]
 */
module.exports = async (bajelfile, argv = process.argv) => {
  const options = getopts(argv.slice(2), {
    boolean: ['d', 'h', 'n', 'p', 's', 't', 'T'],
    alias: {
      d: ['debug'],
      h: ['help'],
      n: ['dry-run'],
      p: ['print'],
      s: ['silent'],
      t: ['targets'],
      T: ['targets-expanded'],
      stopEarly: true
    }
  })
  const { tConsole, tStdout, tStderr } = StrConsole(!options.silent)
  if (options.help) {
    tConsole.log(`
      Usage: bajel [options] [target]
      Options:
       -d, --debug            Explain how decisions are made.
       -h  --help             Show this help.
       -n, --dry-run          Don't execute the recipes.
       -s, --silent           Don't echo anything to stdout or stderr.
       -p  --print            Print the expanded build file
       -T  --targets-expanded Print out all targets after % expansion.
       -t, --targets          Print out all explicit targets before % expansion
       `)
    return [0, tStdout(), tStderr()]
  }

  // Split bajelfile into variables and tasks
  const tasks = new Tasks(bajelfile, tConsole)
  const variables = new Variables(bajelfile)

  if (tasks.explicitTargets().length === 0) {
    const targetsStr = JSON.stringify(tasks.targets())
    tConsole.error(`No explicit targets in ${targetsStr}`)
    return [1, tStdout(), tStderr()]
  }

  if (options.t) {
    tConsole.log(tasks.explicitTargets().join(' '))
    return [0, tStdout(), tStderr()]
  }

  const dryRun = options.n

  try {
    // Phase 1: Expand variables
    tasks.expandVariables(variables)
  } catch (e) {
    tConsole.error('Problem expanding variables: ' + e)
    if (options.p) {
      tConsole.log(bajelfile)
    }
    return [1, tStdout(), tStderr()]
  }

  const start = options._.length > 0
    ? options._[0]
    : tasks.explicitTargets()[0]

  try {
    // Phase 2: Expand percents
    while (tasks.expandDeps(tConsole)) { /** do nothing */ }
  } catch (e) {
    tConsole.error('Problem expanding percents: ' + e)
    if (options.p) {
      tConsole.log(bajelfile)
    }
    return [1, tStdout(), tStderr()]
  }
  if (options.T) {
    tConsole.log(tasks.targets().join(' '))
    return [0, tStdout(), tStderr()]
  }
  if (options.p) {
    tConsole.log(bajelfile)
    return [0, tStdout(), tStderr()]
  }

  try {
    // Phase 3: Executions
    const {
      code,
      updatedTime,
      recipeHappened,
      result
    } = await tasks.recurse([], start, dryRun, options.debug)

    if (code !== 0) {
      tConsole.error(`bajel: recipe for target '${start}' failed\nbajel: *** [error] Error ${code}`)
      return [code, tStdout(), tStderr()]
    }
    if (dryRun) {
      return [0, tStdout(), tStderr(), result]
    }
    const phony = (await timestamp(start) === 0)
    if (phony && !recipeHappened) {
      tConsole.log(`bajel: Nothing to be done for "${start}".`)
    }
    if (!phony && !recipeHappened) {
      tConsole.log(`bajel: '${start}' is up to date. (${ago(updatedTime)})`)
    }
    return [0, tStdout(), tStderr(), result]
  } catch (e) {
    // console.error(e)
    tConsole.error(e.toString())
    return [1, tStdout(), tStderr(), e.toString()]
  }
}
