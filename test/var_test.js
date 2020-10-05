const test = require('ava')
const build = require('../src/index.js')
require('./_test_helper.js')

test('strings', async t => {
  const [code, stdout, stderr] = await build({
    aaa: 'AAA',
    bbb: 'BBB',
    foo: { exec: ': $(aaa) $(bbb)' }
  })

  t.deepEqual(stderr, '')
  t.deepEqual(stdout, ': AAA BBB\n')
  t.deepEqual(code, 0)
})

test('array', async t => {
  const [code, stdout, stderr] = await build({
    xs: ['ppp', 'qqq'],
    foo: { exec: ': $(xs)' }
  })

  t.deepEqual(stderr, '')
  t.deepEqual(stdout, ': ppp qqq\n')
  t.deepEqual(code, 0)
})

test('vars in vars', async t => {
  const [code, stdout, stderr] = await build({
    aaa: 'something',
    bbb: '$(aaa) else',
    foo: { exec: ': $(bbb)' }
  })

  t.deepEqual(stdout, ': something else\n')
  t.deepEqual(stderr, '')
  t.deepEqual(code, 0)
})

test('any order', async t => {
  const [code, stdout, stderr] = await build({
    aaa: '$(bbb) else',
    bbb: 'something',
    foo: { exec: ': $(aaa)' }
  })

  t.deepEqual(stdout, ': something else\n')
  t.deepEqual(stderr, '')
  t.deepEqual(code, 0)
})

test('recursive', async t => {
  const [code, stdout, stderr] = await build({
    aaa: 'plus $(bbb)',
    bbb: 'plus $(ccc)',
    ccc: 'plus $(aaa)',
    foo: { exec: ': $(aaa)' }
  })

  t.deepEqual(stdout, '')
  t.deepEqual(stderr, 'Problem expanding variables: Error: Recursive definition of aaa.\n')
  t.deepEqual(code, 1)
})

test('glob', async t => {
  const [code, stdout, stderr] = await build({
    glob: ['LIC*'],
    foo: {
      deps: ['$(glob)'],
      exec: ': $(glob)'
    }
  })

  t.deepEqual(stderr, '')
  t.deepEqual(stdout, ': LICENSE\n')
  t.deepEqual(code, 0)
})
