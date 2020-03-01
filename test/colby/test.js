const { rm } = require('nodejs-sh')
const fs = require('fs')
const test = require('ava')

// const proxyquire = require('proxyquire')
const build = require('../../index.js')

const { Writable } = require('stream')

const StreamToString = () => {
  let string = ''
  const stream = Writable()
  stream._write = (chunk, enc, next) => {
    string += chunk.toString()
    next()
  }
  const toString = () => string
  return { stream, toString }
}

// const fakeChildProcess = {
//  spawn: cmd => { console.log('spawn', cmd) }
// }

// const build = proxyquire('./index', { child_process: fakeChildProcess })

// http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/

test('Colby1', async t => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake')
  t.false(fs.existsSync('hellomake'))
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const success = await build(
    {
      hellomake: ['hellomake.c', 'hellofunc.c',
        c => 'gcc -o hellomake hellomake.c hellofunc.c -I.']
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.true(success)
  t.true(fs.existsSync('hellomake'))
  t.deepEqual(fakeStderr.toString(), '')
  t.deepEqual(fakeStdout.toString(),
    'gcc -o hellomake hellomake.c hellofunc.c -I.\n' +
   'Execution succeeded.\n')
})

test('Colby2', async t => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake', 'hellomake.o', 'hellofunc.o')
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const CC = 'gcc'
  const CFLAGS = '-I.'
  const success = await build(
    {
      '$1.o': [/(.*)\.c/,
        c => `${CC} -c -o ${c.target} ${c.source} ${CFLAGS}`],
      hellomake: ['hellomake.o', 'hellofunc.o',
        c => `${CC} -o hellomake hellomake.o hellofunc.o`]
    },
    fakeStdout.stream, fakeStderr.stream)

  t.true(success)
  t.true(fs.existsSync('hellomake'))
  t.deepEqual(fakeStderr.toString(), '')
  t.deepEqual(fakeStdout.toString(),
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
  'gcc -c -o hellofunc.o hellofunc.c -I.\n' +
  'gcc -o hellomake hellomake.o hellofunc.o\n' +
  'Execution succeeded.\n')
})

const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']
const bajelfile = {

  '$1.o': [/(.*)\.c/, ...DEPS,
    c => `${CC} -c -o ${c.target} ${c.source} ${CFLAGS}`],

  hellomake: [...OBJ,
    c => `${CC} -o ${c.target} ${c.sources} ${CFLAGS}`]
}

test('Colby4', async t => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake', 'hellomake.o', 'hellofunc.o')
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const success = await build(bajelfile, fakeStdout.stream, fakeStderr.stream)

  t.deepEqual(fakeStdout.toString(),
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -c -o hellofunc.o hellofunc.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o -I.\n' +
    'Execution succeeded.\n')
  t.deepEqual(fakeStderr.toString(), '')
  t.true(success)
  t.true(fs.existsSync('hellomake'))
})

test('Up to date', async t => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake', 'hellomake.o', 'hellofunc.o')
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  await build(bajelfile)
  const success = await build(bajelfile, fakeStdout.stream, fakeStderr.stream)

  t.deepEqual(fakeStdout.toString(),
    'Up to date.\n')
  t.deepEqual(fakeStderr.toString(), '')
  t.true(success)
  t.true(fs.existsSync('hellomake'))
})
