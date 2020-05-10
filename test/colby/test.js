const { rm, touch } = require('nodejs-sh')
const fs = require('fs')
const test = require('ava')
const build = require('../../src/index.js')
const { sleep } = require('../_test_helper.js')

const deepClone = object => JSON.parse(JSON.stringify(object))

// Based on Makefile examples in
// http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/

test.beforeEach('initialize directory', async () => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake', 'hellomake.o', 'hellofunc.o')
})

test.serial('Colby1', async t => {
  t.false(fs.existsSync('hellomake'))
  const [code, stdout, stderr] = await build(
    {
      hellomake: {
        deps: ['hellomake.c', 'hellofunc.c'],
        exec: 'gcc -o hellomake hellomake.c hellofunc.c -I.'
      }
    }
  )

  t.deepEqual(stdout + stderr,
    'gcc -o hellomake hellomake.c hellofunc.c -I.\n')
  t.deepEqual(code, 0)
  t.true(fs.existsSync('hellomake'))
})

test.serial('Colby2', async t => {
  const CC = 'gcc'
  const CFLAGS = '-I.'
  const [code, stdout, stderr] = await build(
    {
      '%.o': {
        deps: ['%.c'],
        exec: `${CC} -c -o $@ $< ${CFLAGS}`
      },
      hellomake: {
        deps: ['hellomake.o', 'hellofunc.o'],
        exec: `${CC} -o hellomake hellomake.o hellofunc.o`
      }
    })

  t.deepEqual(stdout + stderr,
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
const BAJELFILE = {

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
  const bajelfile = deepClone(BAJELFILE)
  const [code, stdout, stderr] = await build(bajelfile)

  t.deepEqual(stdout + stderr,
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -c -o hellofunc.o hellofunc.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o -I.\n')
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})

test.serial('Up to date', async t => {
  const bajelfile1 = deepClone(BAJELFILE)
  const bajelfile2 = deepClone(BAJELFILE)
  await build(bajelfile1)
  const [code, stdout, stderr] = await build(bajelfile2)

  t.regex(stdout + stderr,
    /bajel: 'hellomake' is up to date./)
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})

test.serial('One file updated', async t => {
  const bajelfile1 = deepClone(BAJELFILE)
  const bajelfile2 = deepClone(BAJELFILE)
  await build(bajelfile1)
  await sleep(100)
  touch('hellomake.c')
  await sleep(100)
  const [code, stdout, stderr] = await build(bajelfile2)

  t.deepEqual(stdout,
    'gcc -c -o hellomake.o hellomake.c -I.\n' +
    'gcc -o hellomake hellomake.o hellofunc.o -I.\n')
  t.deepEqual(stderr, '')
  t.deepEqual(0, code)
  t.true(fs.existsSync('hellomake'))
})
