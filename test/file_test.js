const test = require('ava')
const build = require('../index.js')
const { StreamToString } = require('./_test_helper.js')

test('directories are ignored', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  // Using a target that is the same as an existing directory
  // "colby", but it should be ignored and just treated as a label.
  const code = await build(
    {
      main: { deps: ['colby'] },
      colby: { exec: ': it executed' }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStdout.toString() + fakeStderr.toString(),
    ': it executed\n')
  t.deepEqual(0, code)
})
