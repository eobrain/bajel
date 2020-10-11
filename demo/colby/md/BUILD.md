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
