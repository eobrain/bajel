# Bajel : a Simple Build System

![logo][1]

Bajel is an easy way of executing commands for building any kind of target
files.

It will only build a target file if is out of date relative to its dependencies.

You specify the build targets, their dependencies, and the build commands in a
build file which has a very simple conceptual structure:

* A list of targets, each of which has
  * a list of dependencies (`deps`)
  * a command to execute (`exec`)

You can write the build file in your favorite format:

* TOML if you like things clean and readable
* YAML if that's your thing
* JSON if you want just the basics
* JavaScript if you want to use variables for complex builds
* Markdown if you like literate programming

## Installation

```sh
npm install --save-dev bajel
```

## Usage

The command

```sh
npx bajel
```

will build the default target in build file in the current directory.

The default target is the first target in the file that is not a file pattern
(with a `%` wildcard).

```sh
npx bajel foo
```

Will build target `foo`.

```sh
npx bajel -n
```

Will do a dry run, printing out the commands that it would execute, but not
actually executing them.

The build file must be one of the following names:

* `build.toml`
* `build.yaml`
* `build.json`
* `build.cjs` (JavaScript, as a classic Node-JS module)
* `build.mjs` (JavaScript, as a new-style ES6 module -- Node version 13.2.0 or later)
* `build.md`

All these different languages are alternate syntaxes of specifying the same
underlying build file structure, as shown by the following examples (based on a
[makefile example][2]), each of which specify the same thing.
(Though the JavaScript examples additionally show how variables can be used.)

## Examples

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

(This JavaScript module format supported with all versions of Node.)

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
    exec: `${CC} -o $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

### build.mjs

(This JavaScript module format is only supported if your version of Node is 13.2.0 or later.)

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
    exec: `${CC} -o $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

### build.md

<pre>
# Markdown version of build file

## %.o

Deps: `%.c` `hellomake.h`

```sh
gcc -c -o $@ $< -I.
```

## hellomake

Deps: `hellomake.o` `hellofunc.o`

```sh
gcc -o $@ $+ -I.
```

## clean

```sh
rm -f hellomake hellomake.o hellofunc.o
```
</pre>

### Real world examples

* Diagmap's [build.toml][5] is a fairly straightforward build file in TOML
  format. The only slightly tricky aspect is that it take advantage of the `%`
  wild card to create empty `.ok` files to indicate that the corresponding `.js`
  file has successfully passed the StandardJS linter.
* The [build.cjs][4] for a blog uses JavaScript variables, but it is otherwise
  fairly simple.
* Mergi's [build.mjs][3] is a fairly complex build file which uses the power of
  JavaScript to remove duplication by refactoring out common elements. For
  example it extensively uses the `...` spread operator to insert sub arrays
  into the `deps` arrays and to insert new dynamically generated targets into
  the main dictionary.

[3]: https://github.com/eobrain/mergi/blob/master/build.mjs
[4]: https://github.com/eobrain/webhome/blob/master/build.cjs
[5]: https://github.com/eobrain/diagmap/blob/master/build.toml

## Build File Structure

A build file has a set of top level *target* strings, each of which may be

1. A file, that may or may not already exist
2. Or a file pattern with a `%` representing a wildcard.
3. Otherwise just a label

Each target may have a `deps` field which is a list of strings, which either:

1. Another target in the build file
2. An existing file or file pattern

Each target may have an `exec` field which is a string that gets executed by the
Linux-style shell, but only if the target does not exist as a file, or if the
target is older than all the `deps`.

The `exec` string may have some special patterns:

* `%` expands to whatever matched the `%` in the target
* `$@` is replaced by the target (after `%` expansion)
* `$<` is replaced by the first `deps` field (after `%` expansion)
* `$+` is replaced by the all the `deps` fields (after `%` expansion) separated
  by spaces

(If you are familiar with makefiles you will note that the semantics are the
same, though much simplified.)

## Notes

The idea of using markdown came from [maid][3].

## Legal

Copyright (c) 2020 Eamonn O'Brien-Strain All rights reserved. This
program and the accompanying materials are made available under the
terms of the Eclipse Public License v1.0 which accompanies this
distribution, and is available at
http://www.eclipse.org/legal/epl-v10.html

> This is a purely personal project, not a project of my employer.

[1]: bajel.jpg
[2]: http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/
[3]: https://github.com/egoist/maid
