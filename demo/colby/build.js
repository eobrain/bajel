const build = require('../../index.js')

const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

build({

  '%.o': [
    '%.c',
    ...DEPS,
    c => [CC, '-c -o', c.target, c.source, CFLAGS]
  ],

  hellomake: [
    ...OBJ,
    c => [CC, '-o ', c.target, c.sources, CFLAGS]
  ],

  clean: [
    c => ['rm', '-f hellomake', ...OBJ]
  ]

})
