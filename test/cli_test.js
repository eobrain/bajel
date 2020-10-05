const test = require('ava')
const build = require('../src/index.js')
require('./_test_helper.js')

const exec = `
  cd $@
  ../../../src/cli.js clean
  ../../../src/cli.js
  ../../../src/cli.js
  ../../../src/cli.js clean
`

const outFilter = s => s
  .replace(/cd demo\/colby\/\w+/, 'cd demo/colby/???')
  .replace(/\([^)]*\)/, '(...)')
  .replace(
    /\(node:[0-9]+\) ExperimentalWarning: The ESM module loader is experimental.\n\n/mg,
    '')

const expected =
'\n' +
'cd demo/colby/???\n' +
'../../../src/cli.js clean\n' +
'../../../src/cli.js\n' +
'../../../src/cli.js\n' +
'../../../src/cli.js clean\n\n' +
'rm -f hellomake hellomake.o hellofunc.o\n\n' +
'gcc -c -o hellomake.o hellomake.c -I.\n\n' +
'gcc -c -o hellofunc.o hellofunc.c -I.\n\n' +
'gcc -o hellomake hellomake.o hellofunc.o -I.\n\n' +
'bajel: \'hellomake\' is up to date. (...)\n\n' +
'rm -f hellomake hellomake.o hellofunc.o\n\n'

test.serial('toml', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/toml': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('json', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/json': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('yaml', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/yaml': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('yml', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/yml': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('cjs', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/cjs': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('missing build', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /ERROR: No build file/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('cjs compile error', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'this will cause a compile error' > build.cjs
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /Unexpected identifier/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('mjs', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/mjs': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('mjs compile error', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'this will cause a compile error' > build.mjs
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /Unexpected identifier/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('md', async t => {
  const [code, stdout, stderr] = await build({
    'demo/colby/md': { exec }
  })
  t.deepEqual(outFilter(stdout + stderr), expected)
  t.deepEqual(0, code)
})

test.serial('md has no targets', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo '' > build.md
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /has no targets/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('yaml no explicit targets in', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'this is valid yaml, seemingly' > build.yaml
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /No explicit targets in/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('yaml compile error', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'foo:' > build.yaml
      echo 'lack of indent should cause a compile error' >> build.yaml
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /can not read a block mapping entry/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('json compile error', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'this will cause a compile error' > build.json
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /Unexpected token/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})

test.serial('toml compile error', async t => {
  const subDir = Math.random()
  const [code, stdout, stderr] = await build({
    bad: {
      exec: `
      mkdir ${subDir}
      cd ${subDir}
      echo 'this will cause a compile error' > build.toml
      ../src/cli.js
      `
    }
  })
  t.regex(outFilter(stdout + stderr), /Expected "=" or/)
  t.deepEqual(1, code)
  await build({
    cleanup: {
      exec: `rm -r ${subDir}`
    }
  })
})
