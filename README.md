# Bajel : a Simple Build System

![][1]

## Installation

```sh
npm install --save-dev bajel
```

## Example

Given a file `build.js` containing ...

```js
const build = require('bajel')

const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

build({

  '$1.o': [/(.*)\.c/, ...DEPS,
    c => `${CC} -c -o ${c.target} ${c.source} ${CFLAGS}`],

  hellomake: [...OBJ,
    c => `${CC} -o ${c.target} ${c.sources} ${CFLAGS}`],

  clean: [
    c => `rm hellomake ${OBJ.join(' ')}`
  ]

})
```

You can execute the build like so:

```sh
$ node build.js
gcc -c -o hellomake.o hellomake.c -I.
gcc -c -o hellofunc.o hellofunc.c -I.
gcc -o hellomake hellomake.o hellofunc.o -I.
Execution succeeded.
$
```

## Legal

Copyright (c) 2020 Eamonn O'Brien-Strain All rights reserved. This
program and the accompanying materials are made available under the
terms of the Eclipse Public License v1.0 which accompanies this
distribution, and is available at
http://www.eclipse.org/legal/epl-v10.html

> This is a purely personal project, not a project of my employer.

[1]: bajel.jpg
