const test = require('ava')
const markdown = require('../markdown.js')

test('markdown', async t => {
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
