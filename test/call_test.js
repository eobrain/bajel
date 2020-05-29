const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
// const { pp } = require('passprint')

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

test('call to exec', async t => {
  const [code, stdout, stderr, result] = await build({
    ppp: {
      deps: ['qqq'],
      exec: 'cat $0'
    },
    qqq: {
      call: deps => 'QQQ'
    }
  })
  t.deepEqual(stderr, '')
  t.regex(stdout, /calling function: --> qqq/m)
  t.regex(stdout, /cat /m)
  t.regex(stdout, /^QQQ$/m)
  t.deepEqual(code, 0)
})

test('spreadsheet', async t => {
  const [code, stdout, stderr, result] = await build({
    result: {
      deps: ['C1'],
      call: ({ C1 }) => { console.log('C1=', C1); return C1 }
    },

    A1: {
      call: () => 10
    },
    A2: {
      call: () => 12
    },
    A3: {
      call: () => 14
    },
    'B%': {
      deps: ['A%'],
      call: deps => deps[0] * 100
    },
    C1: {
      deps: ['B1', 'B2', 'B3'],
      call: ({ B1, B2, B3 }) => B1 + B2 + B3
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout,
`calling function: --> A1
calling function: --> B1
calling function: --> A2
calling function: --> B2
calling function: --> A3
calling function: --> B3
calling function: --> C1
calling function: --> result
`)
  t.deepEqual(code, 0)
  t.deepEqual(result, 3600)
})
