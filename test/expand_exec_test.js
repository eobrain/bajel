const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
const { buildFileTree } = require('./_test_helper.js')

test('one-level', async t => {
  const { folder, cleanup } = await buildFileTree({
    'aaa.leaf': 'LEAF CONTENT'
  })
  try {
    const [code, stdout, stderr, result] = await build({

      all: {
        deps: [`${folder}/aaa.branch`]
      },

      '%.branch': {
        deps: ['%.leaf'],
        exec: 'cat $< >$@'
      }

    })
    const out = stdout + stderr
    t.regex(out, /^cat test-.*\.leaf >test-.*\.branch$/m)
    const branch = await fs.readFileSync(`${folder}/aaa.branch`, 'utf8')
    t.deepEqual(branch, 'LEAF CONTENT')
    t.deepEqual(result, 'Error: ENOENT: no such file or directory, open \'all\'')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})

test('two-level', async t => {
  const { folder, cleanup } = await buildFileTree({
    'aaa.leaf': 'LEAF CONTENT'
  })
  try {
    const [code, stdout, stderr, result] = await build({

      all: {
        deps: [`${folder}/aaa.trunk`]
      },

      '%.trunk': {
        deps: ['%.branch'],
        exec: 'cat $< >$@'
      },

      '%.branch': {
        deps: ['%.leaf'],
        exec: 'cat $< >$@'
      }

    })
    const out = stdout + stderr
    t.regex(out, /^cat test-.*\.leaf >test-.*\.branch$/m)
    t.regex(out, /^cat test-.*\.branch >test-.*\.trunk$/m)
    const trunk = await fs.readFileSync(`${folder}/aaa.trunk`, 'utf8')
    t.deepEqual(trunk, 'LEAF CONTENT')
    t.deepEqual(result, 'Error: ENOENT: no such file or directory, open \'all\'')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})

test('variable with percent', async t => {
  const { folder, cleanup } = await buildFileTree({
    'aaa.leaf': 'LEAF CONTENT'
  })
  try {
    const [code, stdout, stderr, result] = await build({

      BRANCH: '%.branch',

      all: {
        deps: [`${folder}/aaa.branch`]
      },

      '$(BRANCH)': {
        deps: ['%.leaf'],
        exec: 'cat $< >$@'
      }

    })
    const out = stdout + stderr
    t.regex(out, /^cat test-.*\.leaf >test-.*\.branch$/m)
    const branch = await fs.readFileSync(`${folder}/aaa.branch`, 'utf8')
    t.deepEqual(branch, 'LEAF CONTENT')
    t.deepEqual(result, 'Error: ENOENT: no such file or directory, open \'all\'')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})
