const test = require('ava')
const fs = require('fs')
const markdown = require('../src/markdown.js')
const { writeTmpFile } = require('./_test_helper.js')

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
  const [folder, path] = await writeTmpFile(`
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
  )
  try {
    const bajelfile = await markdown(path)

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
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('deps without target', async t => {
  const [folder, path] = await writeTmpFile(`
# Foo
Deps: \`a_dep\`
`
  )
  try {
    await t.throwsAsync(async () => {
      await markdown(path)
    }, {
      instanceOf: Error,
      message: /file:3: Deps without a target:\nDeps: `a_dep`/m
    })
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('exec without target', async t => {
  const [folder, path] = await writeTmpFile(`
# Foo
\`\`\`sh
an_exec
\`\`\`
`
  )
  try {
    await t.throwsAsync(async () => {
      await markdown(path)
    }, {
      instanceOf: Error,
      message: /file:3: Exec without a target:\n```sh/m
    })
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})
