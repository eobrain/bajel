const test = require('ava')
const build = require('../src/index.js')

const collect = ([code, stdout, stderr]) => ({ code, stdout, stderr })

test.serial('no match', async t => {
  const out = collect(await build(
    {
      foo: { deps: ['bad_target'] }
    }
  ))

  t.deepEqual(out, {
    stderr: 'bad_target is not a file and is not one of the build targets: [ \'foo\' ]\n' +
          'bajel: recipe for target \'foo\' failed\n' +
          'bajel: *** [error] Error 1\n',
    stdout: '',
    code: 1
  })
})

test.serial('self infinite loop', async t => {
  const [code, stdout, stderr] = await build(
    {
      foo: { deps: ['foo'] }
    }
  )

  t.deepEqual(stderr,
    'Error: infinite loop foo → foo\n')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 1)
})

test.serial('indirect infinite loop', async t => {
  const [code, stdout, stderr] = await build(
    {
      aaa: { deps: ['bbb'] },
      bbb: { deps: ['ccc'] },
      ccc: { deps: ['aaa'] }
    }
  )

  t.deepEqual(stderr,
    'Error: infinite loop aaa → bbb → ccc → aaa\n')
  t.deepEqual(stdout, '')
  t.deepEqual(code, 1)
})

test.serial('expansion self infinite loop', async t => {
  const out = collect(await build({

    '%func.bar': { deps: ['%func.bar'] },
    aaa: { exec: ': aaa' }

  }))

  t.deepEqual(out, {
    code: 1,
    stdout: '',
    stderr:
    'Problem expanding percents: Error: infinite loop after expansion test/colby/hellofunc.bar → test/colby/hellofunc.bar\n'
  })
})
test.serial('expansion infinite loop', async t => {
  const [code, stdout, stderr] = await build(
    {
      '%func.bar': { deps: ['%func.c'] },
      'test/colby/hellofunc.c': { deps: ['test/colby/hellofunc.bar'] }
    }
  )

  t.deepEqual(stdout, '')
  t.deepEqual(stderr,
    'Problem expanding percents: Error: infinite loop after expansion test/colby/hellofunc.bar → test/colby/hellofunc.c\n')
  t.deepEqual(code, 1)
})

test.serial('bad deps', async t => {
  const out = collect(await build({

    foo: { deps: 'string dep' }

  }))

  t.deepEqual(out, {
    code: 1,
    stdout: '',
    stderr:
    'Problem expanding percents: Error: Deps should be an array in\n' +
          'foo:{deps:"string dep"}\n'
  })
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
