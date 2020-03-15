const test = require('ava')
const build = require('../index.js')

test('directories are ignored', async t => {
  // Using a target that is the same as an existing directory
  // "colby", but it should be ignored and just treated as a label.
  const [code, stdout, stderr] = await build(
    {
      main: { deps: ['colby'] },
      colby: { exec: ': it executed' }
    }
  )

  t.deepEqual(stdout + stderr,
    ': it executed\n')
  t.deepEqual(0, code)
})
