const test = require('ava')
const build = require('../index.js')
const fs = require('fs')
const { StreamToString } = require('./_test_helper.js')

test.serial('help text', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  process.argv.push('-h')
  try {
    const code = await build(
      {
        foo: { exec: ': it executed' }
      },
      fakeStdout.stream, fakeStderr.stream
    )

    t.deepEqual(fakeStdout.toString(), `
       usage: bajel[-n][-p][-h][target]
       -n  dry run
       -p  print out the expanded build file
       -h  this help
       \n`)
    t.deepEqual(fakeStderr.toString(), '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('empty', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {},
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStdout.toString(), '')
  t.deepEqual(fakeStderr.toString(), 'No explicit targets in []\n')
  t.deepEqual(code, 1)
})

test.serial('dry run', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  process.argv.push('-n')
  try {
    const code = await build(
      {
        should_not_be_created: { exec: 'echo > $@' }
      },
      fakeStdout.stream, fakeStderr.stream
    )

    t.deepEqual(fakeStdout.toString(), 'echo > should_not_be_created\n')
    t.deepEqual(fakeStderr.toString(), '')
    t.deepEqual(code, 0)
    t.false(fs.existsSync('should_not_be_created'))
  } finally {
    process.argv.pop()
  }
})

test.serial('bad exec', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      start: { deps: ['fail'] },
      fail: { exec: 'false' }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStdout.toString(), 'false\n')
  t.deepEqual(fakeStderr.toString(),
    'FAILED with code 1: \n' +
        'false\n' +
        '\n' +
        'FAILED   fail : \n' +
        'bajel: recipe for target \'start\' failed\n' +
        'bajel: *** [error] Error 1\n'
  )
  t.deepEqual(code, 1)
})

test.serial('bad exec debug', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  process.argv.push('-d')
  try {
    const code = await build(
      {
        start: { deps: ['fail'] },
        fail: { exec: 'false' }
      },
      fakeStdout.stream, fakeStderr.stream
    )

    t.deepEqual(fakeStdout.toString(),
      'target "fail" does not exist and its most recent deps does not exist\n' +
            'target "fail" does not exist and has an exec\n' +
            'false\n' +
            'target "start" -- execution of dep target "fail" failed. Stopping.\n')
    t.deepEqual(fakeStderr.toString(),
      'FAILED with code 1: \n' +
            'false\n' +
            '\n' +
            'FAILED   fail : \n' +
            'bajel: recipe for target \'start\' failed\n' +
            'bajel: *** [error] Error 1\n'
    )
    t.deepEqual(code, 1)
  } finally {
    process.argv.pop()
  }
})

test.serial('no match', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      foo: { deps: ['bad_target'] }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStderr.toString(),
    'bad_target is not a file and is not one of the build targets: [ \'foo\' ]\n' +
        'bajel: recipe for target \'foo\' failed\n' +
        'bajel: *** [error] Error 1\n')
  t.deepEqual(fakeStdout.toString(), '')
  t.deepEqual(code, 1)
})

test.serial('bad deps', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      foo: { deps: 'string dep' }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStderr.toString(),
    'Problem expanding percents: Error: Deps should be an array in\n' +
        '"foo":{\n' +
        ' "deps": "string dep"\n' +
        '}\n')
  t.deepEqual(fakeStdout.toString(), '')
  t.deepEqual(code, 1)
})

test.serial('bad percent', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      '%.c': { deps: ['foo'] },
      foo: { exec: ': hello' }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStderr.toString(),
    'Problem expanding percents: Error: Target "%.c" has replacement pattern, but dependencies have no percents: ["foo"]\n')
  t.deepEqual(fakeStdout.toString(), '')
  t.deepEqual(code, 1)
})

test('no percent match', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const code = await build(
    {
      '%.c': { deps: ['%.none'] },
      foo: { exec: ': hello' }
    },
    fakeStdout.stream, fakeStderr.stream
  )

  t.deepEqual(fakeStderr.toString(), 'No match for "%.c"\n')
  t.deepEqual(fakeStdout.toString(), ': hello\n')
  t.deepEqual(code, 0)
})
