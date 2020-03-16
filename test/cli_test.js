const test = require('ava')
const build = require('../index.js')

const exec = `
  cd $@
  ../../../cli.js clean
  ../../../cli.js
  ../../../cli.js
  ../../../cli.js clean
`

const outFilter = s => s
  .replace(/cd demo\/colby\/\w+/, 'cd demo/colby/???')
  .replace(/\([^)]*\)/, '(...)')
  .replace(
    /\(node:[0-9]+\) ExperimentalWarning: The ESM module loader is experimental.\n\n/mg,
    '')

const expected =
'\n' +
'cd demo/colby/???\n' +
'../../../cli.js clean\n' +
'../../../cli.js\n' +
'../../../cli.js\n' +
'../../../cli.js clean\n\n' +
'rm -f hellomake hellomake.o hellofunc.o\n\n' +
'gcc -c -o hellomake.o hellomake.c -I.\n\n' +
'gcc -c -o hellofunc.o hellofunc.c -I.\n\n' +
'gcc -o hellomake hellomake.o hellofunc.o -I.\n\n' +
'bajel: \'hellomake\' is up to date. (...)\n\n' +
'rm -f hellomake hellomake.o hellofunc.o\n\n'

test('toml', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/toml': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test('json', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/json': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test('yaml', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/yaml': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test('cjs', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/cjs': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test('mjs', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/mjs': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test('md', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/md': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})
