const test = require('ava')
const TeeConsole = require('../src/teeconsole.js')

test('log', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole(false)

  tConsole.log('hello world')

  t.deepEqual(tStdout(), 'hello world\n')
  t.deepEqual(tStderr(), '')
})

test('warn', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole(false)

  tConsole.warn('Hmmm')

  t.deepEqual(tStdout(), '')
  t.deepEqual(tStderr(), 'Hmmm\n')
})

test('error', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole(false)

  tConsole.error('Ooops!')

  t.deepEqual(tStdout(), '')
  t.deepEqual(tStderr(), 'Ooops!\n')
})

test('all', t => {
  const { tConsole, tStdout, tStderr } = TeeConsole(false)

  tConsole.log('logged')
  tConsole.warn('warned')
  tConsole.error('errored')

  t.deepEqual(tStdout(), 'logged\n')
  t.deepEqual(tStderr(), 'warned\nerrored\n')
})

test('many', t => {
  const N = 10
  const teeConsoles = []
  for (let i = 0; i < N; ++i) {
    teeConsoles.push(TeeConsole(false))
  }

  for (let i = 0; i < N; ++i) {
    const { tConsole } = teeConsoles[i]
    tConsole.log(`logged # ${i}`)
  }

  for (let i = 0; i < N; ++i) {
    const { tStdout } = teeConsoles[i]
    t.deepEqual(tStdout(), `logged # ${i}\n`)
  }
})

const getRandomInt = max => Math.floor(Math.random() * Math.floor(max))

test('many async', t => {
  const N = 10
  const teeConsoles = []
  for (let i = 0; i < N; ++i) {
    teeConsoles.push(TeeConsole(false))
  }

  const logPromises = []
  for (let i = 0; i < N; ++i) {
    const { tConsole } = teeConsoles[i]
    logPromises.push(new Promise(resolve => {
      setTimeout(() => {
        tConsole.error(`async logged # ${i}`)
        resolve()
      }, getRandomInt(10))
    }))
  }

  const testPromises = []
  for (let i = 0; i < N; ++i) {
    const { tStderr } = teeConsoles[i]
    testPromises.push(logPromises[i].then(() => {
      t.deepEqual(tStderr(), `async logged # ${i}\n`)
    }))
  }

  return Promise.all(testPromises)
})

test('many async large', t => {
  const N = 10
  const teeConsoles = []
  for (let i = 0; i < N; ++i) {
    teeConsoles.push(TeeConsole(false))
  }

  const big = i => [...Array(1000)].map(() => 'X' + i).join('')

  const logPromises = []
  for (let i = 0; i < N; ++i) {
    const { tConsole } = teeConsoles[i]
    logPromises.push(new Promise(resolve => {
      setTimeout(() => {
        tConsole.error(big(i))
        resolve()
      }, getRandomInt(10))
    }))
  }

  const testPromises = []
  for (let i = 0; i < N; ++i) {
    const { tStderr } = teeConsoles[i]
    testPromises.push(logPromises[i].then(() => {
      t.deepEqual(tStderr(), big(i) + '\n')
    }))
  }

  return Promise.all(testPromises)
})
