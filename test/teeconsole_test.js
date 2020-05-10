const test = require('ava')
const TeeConsole = require('../src/teeconsole.js')

test('log', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole()

  tConsole.log('hello world')

  t.deepEqual(tStdout(), 'hello world\n')
  t.deepEqual(tStderr(), '')
})

test('warn', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole()

  tConsole.warn('Hmmm')

  t.deepEqual(tStdout(), '')
  t.deepEqual(tStderr(), 'Hmmm\n')
})

test('error', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole()

  tConsole.error('Ooops!')

  t.deepEqual(tStdout(), '')
  t.deepEqual(tStderr(), 'Ooops!\n')
})

test('all', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole()

  tConsole.log('logged')
  tConsole.warn('warned')
  tConsole.error('errored')

  t.deepEqual(tStdout(), 'logged\n')
  t.deepEqual(tStderr(), 'warned\nerrored\n')
})
