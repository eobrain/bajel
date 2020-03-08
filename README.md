# Bajel : a Simple Build System

![][1]

## Installation

```sh
npm install --save-dev bajel
```

## Examples

The command

```sh
npx bajel
```

will execute the build file whose name must be of the form `build.*` in the current directory, where the suffix depends on the language of the build file, of which several are supported:

* `build.toml` 
* `build.yaml`
* `build.json`
* `build.cjs` (JavaScript, as a classic Node-JS module)
* `build.mjs` (JavaScript as a new-style ES6 module)

All these different languages are alternate syntaxes of specifying the same underlying build file structure, as shown by the following examples (based on a [makefile example][2]), each of which specify the same thing: 

### build.toml

```toml
["%.o"]
deps = ["%.c", "hellomake.h"]
exec = "gcc -c -o $@ $< -I."

[hellomake]
deps = ["hellomake.o", "hellofunc.o"]
exec = "gcc -o $@ $+ -I."

[clean]
exec = "rm -f hellomake hellomake.o hellofunc.o"
```

### build.yaml

```yaml
"%.o":
  deps:
    - "%.c"
    - hellomake.h
  exec: gcc -c -o $@ $< -I.

hellomake:
  deps:
    - hellomake.o
    - hellofunc.o
  exec: gcc -o $@ $+ -I.

clean:
  exec: rm -f hellomake hellomake.o hellofunc.o
```

### build.json

```json
{
  "%.o": {
    "deps": [
      "%.c",
      "hellomake.h"
    ],
    "exec": "gcc -c -o $@ $< -I."
  },

  "hellomake": {
    "deps": [
      "hellomake.o",
      "hellofunc.o"
    ],
    "exec": "gcc -o $@ $+ -I."
  },

  "clean": {
    "exec": "rm -f hellomake hellomake.o hellofunc.o"
  }
}
```

### build.cjs

```js
const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

module.exports = {

  '%.o': {
    deps: ['%.c', ...DEPS],
    exec: `${CC} -c -o $@ $< ${CFLAGS}`
  },

  hellomake: {
    deps: OBJ,
    exec: `${CC} -o  $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

### build.mjs

```js
const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

export default {

  '%.o': {
    deps: ['%.c', ...DEPS],
    exec: `${CC} -c -o $@ $< ${CFLAGS}`
  },

  hellomake: {
    deps: OBJ,
    exec: `${CC} -o  $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

## Build File Structure

A build file has a set of top level *target* strings, each of which may be

1. A file, that may or may not already exist
2. Or a file pattern with a `%` representing a wildcard.
3. Otherwise just a label

Each target may have a `deps` field which is a list of strings, which either:

1. Another target in the build file
2. An existing file or file pattern 

Each target may have an `exec` field which is a string that gets executed by the Linux-style shell, but only if the target does not exist as a file, or if the target is older than all the `deps`.

The `exec` string may have some special patterns that get expanded:

* `%` expands to whatever matched the `%` in the target
* `$@` expands to the target, with any `%` expanded to the matching file path
* `$<` expands to the first `deps` field
* `$+` expands to all the `deps` fields, separated by spaces

(People familiar with makefiles will note that the samantics are the same, though much simplified.)

## Legal

Copyright (c) 2020 Eamonn O'Brien-Strain All rights reserved. This
program and the accompanying materials are made available under the
terms of the Eclipse Public License v1.0 which accompanies this
distribution, and is available at
http://www.eclipse.org/legal/epl-v10.html

> This is a purely personal project, not a project of my employer.

[1]: bajel.jpg
[2]: http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/