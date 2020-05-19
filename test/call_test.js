const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
// const tee = require('../src/tee.js')

test.beforeEach(t => {
  if (fs.existsSync('/tmp/ccc')) {
    fs.unlinkSync('/tmp/ccc')
  }
})

test('call', async t => {
  const results = []
  // process.argv.push('-d')
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['bbb'],
      call: ({ bbb }) => {
        results.push(`bbb=${bbb}`)
      }
    },
    bbb: {
      call: $ => 'BBB'
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function: --> bbb\n' +
  'calling function: --> aaa\n'
  )
  t.deepEqual(code, 0)
  t.deepEqual(results, ['bbb=BBB'])
})

test('read', async t => {
  const results = []
  // process.argv.push('-d')
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['/tmp/ccc'],
      call: deps => {
        results.push(`/tmp/ccc=${deps['/tmp/ccc']}`)
      }
    },
    '/tmp/ccc': {
      exec: 'echo CCC > $@'
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'echo CCC > /tmp/ccc\n' +
  'calling function: --> aaa\n')
  t.deepEqual(results, ['/tmp/ccc=CCC\n'])
  t.deepEqual(code, 0)
})
