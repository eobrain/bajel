const test = require('ava')
const build = require('../index.js')
const fs = require('fs')
/* const tee = x => {
  console.log(x)
  return x
} */

test.beforeEach(t => {
  if (fs.existsSync('/tmp/bbb')) {
    fs.unlinkSync('/tmp/bbb')
  }
})

test('call', async t => {
  const results = []
  // process.argv.push('-d')
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['/tmp/bbb'],
      call: ({ target, source, sources }) => {
        results.push(`target=${target.path} source=${source.path} sources=${sources.map(s => s.path)}`)
      }
    },
    '/tmp/bbb': {
      call: $ => {
        results.push(`target=${$.target.path}`)
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function:  --> /tmp/bbb\n' +
  'calling function: /tmp/bbb --> aaa\n'
  )
  t.deepEqual(code, 0)
  t.deepEqual(results, ['target=/tmp/bbb', 'target=aaa source=/tmp/bbb sources=/tmp/bbb'])
})

test('echo', async t => {
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['/tmp/bbb'],
      call: ({ target, source, sources, echo }) => {
        echo(`target=${target.path} source=${source.path}`)
      }
    },
    '/tmp/bbb': {
      call: $ => {
        $.echo(`target=${$.target.path}`)
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function:  --> /tmp/bbb\n' +
  'target=/tmp/bbb\n' +
  'calling function: /tmp/bbb --> aaa\n' +
  'target=aaa source=/tmp/bbb\n')
  t.deepEqual(code, 0)
})

test('read-write', async t => {
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['/tmp/bbb'],
      call: ({ target, source, sources, echo }) => {
        echo(`/tmp/bbb=${source.read()}`)
      }
    },
    '/tmp/bbb': {
      call: $ => {
        $.target.write('BBB')
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function:  --> /tmp/bbb\n' +
  'calling function: /tmp/bbb --> aaa\n' +
  '/tmp/bbb=BBB\n')
  t.deepEqual(code, 0)
})
