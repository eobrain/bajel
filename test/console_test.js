const test = require('ava')
const build = require('../index.js')
const fs = require('fs')
const { buildFileTree, writeTmpFile } = require('./_test_helper.js')

test('happy path', async t => {
  const [code, stdout, stderr] = await build(
    {
      a: {
        deps: ['b'],
        exec: 'echo aaa'
      },
      b: {
        deps: ['c'],
        exec: 'echo bbb >&2' // echo to stderr
      },
      c: {
        exec: 'echo ccc'
      }
    }
  )

  const actualSorted = stdout.split(/\n+/).sort()
  const expectedSorted = [
    '',
    'echo ccc',
    'ccc',
    'echo bbb >&2',
    'echo aaa',
    'aaa'
  ].sort()

  t.deepEqual(actualSorted, expectedSorted)
  t.deepEqual(stderr, 'bbb\n\n')
  t.deepEqual(code, 0)
})
test.serial('help text', async t => {
  process.argv.push('-h')
  try {
    const [code, stdout, stderr] = await build(
      {
        foo: { exec: ': it executed' }
      }
    )

    t.deepEqual(stdout, `
       usage: bajel[-n][-p][-h][target]
       -n  dry run
       -p  print out the expanded build file
       -d  debug
       -t  print out all explicit targets before % expansion
       -T  print out all targets after % expansion
       -h  this help
       \n`)
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('empty', async t => {
  const [code, stdout, stderr] = await build(
    {}
  )

  t.deepEqual(stdout, '')
  t.deepEqual(stderr, 'No explicit targets in []\n')
  t.deepEqual(code, 1)
})

test.serial('nothing to be done', async t => {
  const [code, stdout, stderr] = await build(
    {
      does_not_exist: {}
    }
  )

  t.deepEqual(stdout,
    'bajel: Nothing to be done for "does_not_exist".\n')
  t.deepEqual(stderr, '')
  t.deepEqual(code, 0)
})

test.serial('dry run', async t => {
  process.argv.push('-n')
  try {
    const [code, stdout, stderr] = await build(
      {
        should_not_be_created: { exec: 'echo > $@' }
      }
    )

    t.deepEqual(stdout, 'echo > should_not_be_created\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
    t.false(fs.existsSync('should_not_be_created'))
  } finally {
    process.argv.pop()
  }
})

test.serial('bad exec', async t => {
  const [code, stdout, stderr] = await build(
    {
      start: { deps: ['fail'] },
      fail: { exec: 'false' }
    }
  )

  t.deepEqual(stdout, 'false\n')
  t.deepEqual(stderr,
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
  process.argv.push('-d')
  try {
    const [code, stdout, stderr] = await build(
      {
        start: { deps: ['fail'] },
        fail: { exec: 'false' }
      }
    )

    t.deepEqual(stdout,
      'target "fail" does not exist and its most recent deps does not exist\n' +
            'target "fail" does not exist and has an exec\n' +
            'false\n' +
            'target "start" -- execution of dep target "fail" failed. Stopping.\n')
    t.deepEqual(stderr,
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

test.serial('missing exec debug', async t => {
  process.argv.push('-d')
  try {
    const [code, stdout, stderr] = await build(
      {
        start: { deps: ['noop'] },
        noop: { }
      }
    )

    t.deepEqual(stdout,
      'target "noop" does not exist and its most recent deps does not exist\n' +
      'target "noop" has no exec\n' +
      'target "start" does not exist and its most recent deps does not exist\n' +
      'target "start" has no exec\n' +
      'bajel: Nothing to be done for "start".\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('no match', async t => {
  const [code, stdout, stderr] = await build(
    {
      foo: { deps: ['bad_target'] }
    }
  )

  t.deepEqual(stderr,
    'bad_target is not a file and is not one of the build targets: [ \'foo\' ]\n' +
        'bajel: recipe for target \'foo\' failed\n' +
        'bajel: *** [error] Error 1\n')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 1)
})

test.serial('bad deps', async t => {
  const [code, stdout, stderr] = await build(
    {
      foo: { deps: 'string dep' }
    }
  )

  t.deepEqual(stderr,
    'Problem expanding percents: Error: Deps should be an array in\n' +
        '"foo":{\n' +
        ' "deps": "string dep"\n' +
        '}\n')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 1)
})

test.serial('bad percent', async t => {
  const [code, stdout, stderr] = await build(
    {
      '%.c': { deps: ['foo'] },
      foo: { exec: ': hello' }
    }
  )

  t.deepEqual(stderr,
    'Problem expanding percents: Error: Target "%.c" has replacement pattern, but dependencies have no percents: ["foo"]\n')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 1)
})

test('no percent match', async t => {
  const [code, stdout, stderr] = await build(
    {
      '%.c': { deps: ['%.none'] },
      foo: { exec: ': hello' }
    }
  )

  t.deepEqual(stderr, 'No match for "%.c"\n')
  t.deepEqual(stdout, ': hello\n')
  t.deepEqual(code, 0)
})

test('duplicate targets', async t => {
  const [code, stdout, stderr] = await build(
    {
      '%.c': { deps: ['%.bar'] },
      foo: { exec: ': foofoo' },
      'test/colby/hellofunc.c': { exec: ': hello' }
    }
  )

  t.deepEqual(stdout, ': foofoo\n')
  t.deepEqual(stderr,
    'Duplicate targets\n' +
        '"test/colby/hellofunc.c": {"exec":": hello"}\n' +
        '"test/colby/hellofunc.c": {"deps":["test/colby/hellofunc.bar"]}\n')
  t.deepEqual(code, 0)
})

test.serial('print', async t => {
  process.argv.push('-p')
  try {
    const [code, stdout, stderr] = await build(
      {
        foo: { exec: ': it executed' }
      }
    )

    t.deepEqual(stdout,
      '{ foo: { exec: \': it executed\' } }\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('non default', async t => {
  process.argv.push('second')
  try {
    const [code, stdout, stderr] = await build(
      {
        first: { exec: ': first executed' },
        second: { exec: ': second executed' }
      }
    )

    t.deepEqual(stdout, ': second executed\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('bad deps with print', async t => {
  process.argv.push('-p')
  try {
    const [code, stdout, stderr] = await build(
      {
        foo: { deps: 'string dep' }
      }
    )

    t.deepEqual(stderr,
      'Problem expanding percents: Error: Deps should be an array in\n' +
            '"foo":{\n' +
            ' "deps": "string dep"\n' +
            '}\n')
    t.deepEqual(stdout,
      '{ foo: { deps: \'string dep\' } }\n')
    t.deepEqual(code, 1)
  } finally {
    process.argv.pop()
  }
})

test.serial('exception', async t => {
  const [code, stdout, stderr] = await build(
    {
      foo: { exec: {} }
    }
  )

  t.deepEqual(stdout, '')
  t.deepEqual(stderr,
    'TypeError: exec of target "foo" should be a string\n')
  t.deepEqual(code, 1)
})

test.serial('targets before expansion', async t => {
  process.argv.push('-t')
  try {
    const [code, stdout, stderr] = await build(
      {
        '%.foo': { deps: ['%.bar'] },
        main: { exec: ': it executed' }
      }
    )

    t.deepEqual(stdout, 'main\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test.serial('targets after expansion', async t => {
  process.argv.push('-T')
  try {
    const [code, stdout, stderr] = await build(
      {
        '%.foo': { deps: ['%.bar'] },
        main: { exec: ': it executed' }
      }
    )

    t.deepEqual(stdout, 'main test/colby/hellofunc.foo\n')
    t.deepEqual(stderr, '')
    t.deepEqual(code, 0)
  } finally {
    process.argv.pop()
  }
})

test('existing file', async t => {
  const [folder, path] = await writeTmpFile('AAA')
  try {
    const [code, stdout, stderr] = await build(
      {
        [path]: {
          exec: ': for aaa'
        }
      }
    )

    const out = stdout + stderr
    t.regex(out, /bajel: .+ is up to date. .modified [0-9.]+m?s ago./)
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('seconds old existing file', async t => {
  const folder = await buildFileTree({})
  try {
    await build(
      {
        [`${folder}/bbb`]: {
          exec: 'touch --date "5 seconds ago" $@'
        }
      }
    )
    const [code, stdout, stderr] = await build(
      {
        [`${folder}/bbb`]: {
          exec: ': for bbb'
        }
      }
    )

    const out = stdout + stderr
    t.regex(out, /bajel: .+ is up to date. .modified [0-9.]+s ago./)
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('minutes old existing file', async t => {
  const folder = await buildFileTree({})
  try {
    await build(
      {
        [`${folder}/bbb`]: {
          exec: 'touch --date "5 minutes ago" $@'
        }
      }
    )
    const [code, stdout, stderr] = await build(
      {
        [`${folder}/bbb`]: {
          exec: ': for bbb'
        }
      }
    )

    const out = stdout + stderr
    t.regex(out, /bajel: .+ is up to date. .modified [0-9.]+ min ago./)
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('hours old existing file', async t => {
  const folder = await buildFileTree({})
  try {
    await build(
      {
        [`${folder}/bbb`]: {
          exec: 'touch --date "5 hours ago" $@'
        }
      }
    )
    const [code, stdout, stderr] = await build(
      {
        [`${folder}/bbb`]: {
          exec: ': for bbb'
        }
      }
    )

    const out = stdout + stderr
    t.regex(out, /bajel: .+ is up to date. .modified [0-9.]+ hours ago./)
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('very old existing file', async t => {
  const folder = await buildFileTree({})
  try {
    await build(
      {
        [`${folder}/bbb`]: {
          exec: 'touch --date "1 year ago" $@'
        }
      }
    )
    const [code, stdout, stderr] = await build(
      {
        [`${folder}/bbb`]: {
          exec: ': for bbb'
        }
      }
    )

    const out = stdout + stderr
    t.regex(out, /bajel: .+ is up to date. .modified [0-9.]+ days ago./)
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})
