# Development

Clone or fork the repository.

```shell
git clone git@github.com:milesstoetzner/stoetzms-work.git
```

Make sure that your IDE is using Prettier and ESLint and their corresponding configurations.

## Code

For installing dependencies ...

```shell
yarn
```

For running the current code ...

```shell
yarn work
```

For linting ...

```shell
yarn lint:check
```

For fixing lint errors ...

```shell
yarn lint:fix
```

For checking the code style ...

```shell
yarn style:check
```

For fixing code style errors ...

```shell
yarn style:fix
```

## Distribution

For transpiling the project ...

```shell
yarn dist:build
```

For bundling the transpiled code as binaries ...

```shell
yarn dist:package
```

For compressing the binaries ...

```shell
yarn dist:compress
```

## Licenses

For checking the licenses of dependencies ...

```shell
yarn license:check
```

For generating a report containing the licenses of dependencies ...

```shell
yarn license:generate
```

## Documentation

We use Vitepress for our documentation. For locally starting the documentation ...

```shell
yarn docs:dev
```

For building the documentation ...

```shell
yarn docs:build
```

For previewing the build documentation ...

```shell
yarn docs:preview
```
