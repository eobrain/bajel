const { rm, touch } = require('nodejs-sh')
const fs = require('fs')
const test = require('ava')
const build = require('../../index.js')
const { StreamToString, sleep } = require('../_test_helper.js')

// Based on Makefile examples in
// http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/

test.beforeEach('initialize directory', async () => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake', 'hellomake.o', 'hellofunc.o')
})

test.serial('Colby1', async t => {
  t.false(fs.existsSync('hellomake'))
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      hellomake: {
        deps: ['hellomake.c', 'hellofunc.c'],
        exec: 'gcc -o hellomake hellomake.c hellofunc.c -I.'
      }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStdout.toString() + fakeStderr.toString(),
    'gcc -o hellomake hellomake.c hellofunc.c -I.\n')
  t.deepEqual(code, 0)
  t.true(fs.existsSync('hellomake'))
})

test.serial('Colby2', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const CC = 'gcc'
  const CFLAGS = '-I.'
  const code = await build(
    {
      '%.o': {
        deps: ['%.c'],
        exec: `${CC} -c -o $@ $< ${CFLAGS}`
      },
      hellomake: {
        deps: ['hellomake.o', 'hellofunc.o'],
        exec: `${CC} -o hellomake hellomake.o hellofunc.o`
      }
    },
    fakeStdout.stream, fakeStderr.stream)

  t.deepEqual(fakeStdout.toString() + fakeStderr.toString(),
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -c -o hellofunc.o hellofunc.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o\n')
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})

const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']
const bajelfile = {

  '%.o': {
    deps: ['%.c', ...DEPS],
    exec: `${CC} -c -o $@ $< ${CFLAGS}`
  },

  hellomake: {
    deps: OBJ,
    exec: `${CC} -o $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }
}

test.serial('Colby4', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(bajelfile, fakeStdout.stream, fakeStderr.stream)

  t.deepEqual(fakeStdout.toString() + fakeStderr.toString(),
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -c -o hellofunc.o hellofunc.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o -I.\n')
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})

test.serial('Up to date', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  await build(bajelfile)
  const code = await build(bajelfile, fakeStdout.stream, fakeStderr.stream)

  t.regex(fakeStdout.toString() + fakeStderr.toString(),
    /bajel: 'hellomake' is up to date./)
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})

test.serial('One file updated', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  await build(bajelfile)
  await sleep(100)
  touch('hellomake.c')
  const code = await build(bajelfile, fakeStdout.stream, fakeStderr.stream)

  t.deepEqual(fakeStdout.toString(),
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o -I.\n')
  t.deepEqual(fakeStderr.toString(), '')
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})
