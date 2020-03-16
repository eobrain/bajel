const test = require('ava')
const markdown = require('../markdown.js')
const { buildFileTree } = require('./_test_helper.js')

test('colby', async t => {
  const bajelfile = await markdown('demo/colby/md/build.md')

  const expected = {
    '%.o': {
      deps: ['%.c', 'hellomake.h'],
      exec: 'gcc -c -o $@ $< -I.'
    },
    hellomake: {
      deps: ['hellomake.o', 'hellofunc.o'
      ],
      exec: 'gcc -o $@ $+ -I.'
    },
    clean: {
      exec: 'rm -f hellomake hellomake.o hellofunc.o'
    }
  }
  t.deepEqual(bajelfile, expected)
})

test('markdown', async t => {
  const folder = await buildFileTree({
    'foo.md': `
# Foo
## a_target 
Deps: \`a_dep\` \`another_dep\`
\`\`\`sh
an_exec
\`\`\`
## another_target
\`\`\`sh
a
multi
line
exec
\`\`\`
`
  })

  const bajelfile = await markdown(`${folder}/foo.md`)

  const expected = {
    a_target: {
      deps: ['a_dep', 'another_dep'],
      exec: 'an_exec'
    },
    another_target: {
      exec: 'a\nmulti\nline\nexec'
    }
  }
  t.deepEqual(bajelfile, expected)
})

test('deps without target', async t => {
  const folder = await buildFileTree({
    'foo.md': `
# Foo
Deps: \`a_dep\`
`
  })

  await t.throwsAsync(async () => {
    await markdown(`${folder}/foo.md`)
  }, {
    instanceOf: Error,
    message: /foo.md:3: Deps without a target:\nDeps: `a_dep`/m
  })
})

test('exec without target', async t => {
  const folder = await buildFileTree({
    'foo.md': `
# Foo
\`\`\`sh
an_exec
\`\`\`
`
  })

  await t.throwsAsync(async () => {
    await markdown(`${folder}/foo.md`)
  }, {
    instanceOf: Error,
    message: /foo.md:3: Exec without a target:\n```sh/m
  })
})
