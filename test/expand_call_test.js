const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
const { buildFileTree } = require('./_test_helper.js')

test('one-level', async t => {
  const folder = await buildFileTree({
    'aaa.leaf': 'LEAF CONTENT'
  })
  const [code, stdout, stderr, result] = await build({

    all: {
      deps: [`${folder}/aaa.branch`],
      call: deps => '{branch=' + deps[Object.keys(deps)[0]] + '}'
    },

    '%.branch': {
      deps: ['%.leaf'],
      call: deps => '{leaf=' + deps[Object.keys(deps)[0]] + '}'
    }

  })
  const out = stdout + stderr
  t.regex(out, /^calling function: --> test-.*\.branch$/m)
  t.deepEqual(result, '{branch={leaf=LEAF CONTENT}}')
  t.deepEqual(0, code)
})

test('two-level', async t => {
  const folder = await buildFileTree({
    'aaa.leaf': 'LEAF CONTENT'
  })
  const [code, stdout, stderr, result] = await build({

    all: {
      deps: [`${folder}/aaa.trunk`],
      call: deps => '{trunk=' + deps[Object.keys(deps)[0]] + '}'
    },

    '%.trunk': {
      deps: ['%.branch'],
      call: deps => '{branch=' + deps[Object.keys(deps)[0]] + '}'
    },

    '%.branch': {
      deps: ['%.leaf'],
      call: deps => '{leaf=' + deps[Object.keys(deps)[0]] + '}'
    }

  })
  const out = stdout + stderr
  t.regex(out, /^calling function: --> test-.*\.branch$/m)
  t.regex(out, /^calling function: --> test-.*\.trunk$/m)
  t.deepEqual(result, '{trunk={branch={leaf=LEAF CONTENT}}}')
  t.deepEqual(0, code)
})
