const test = require('ava')
const build = require('../index.js')

/* const tee = x => {
  console.log(x)
  return x
} */

test('call', async t => {
  const result = []
  const [code, stdout, stderr] = await build({
    aaa: {
      deps: ['bbb'],
      call: ({ target, source, sources }) => {
        result.push(`target=${target} source=${source} sources=${sources}`)
      }
    },
    bbb: {
      call: $ => {
        result.push(`target=${$.target}`)
      }
    }
  })
  t.deepEqual(stderr, '')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 0)
  t.deepEqual(result, [
    'target=bbb',
    'target=aaa source=bbb sources=bbb'])
})
