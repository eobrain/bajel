const test = require('ava')
const build = require('../index.js')

/* const tee = x => {
  console.log(x)
  return x
} */

test('call', async t => {
  const results = []
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['bbb'],
      call: ({ target, source, sources, echo }) => {
        results.push(`target=${target} source=${source} sources=${sources}`)
      }
    },
    bbb: {
      call: $ => {
        results.push(`target=${$.target}`)
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function:  --> bbb\n' +
  'calling function: bbb --> aaa\n'
  )
  t.deepEqual(code, 0)
  t.deepEqual(results, ['target=bbb', 'target=aaa source=bbb sources=bbb'])
})

test('echo', async t => {
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['bbb'],
      call: ({ target, source, sources, echo }) => {
        echo(`target=${target} source=${source} sources=${sources}`)
      }
    },
    bbb: {
      call: $ => {
        $.echo(`target=${$.target}`)
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, 'calling function:  --> bbb\n' +
  'target=bbb\n' +
  'calling function: bbb --> aaa\n' +
  'target=aaa source=bbb sources=bbb\n')
  t.deepEqual(code, 0)
})
