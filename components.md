# Components

## CloudFormation Templates

The CloudFormation test templates are in the templates/test folder. The current templates are:

1. Master: the template contains all the resources for QnABot.
2. Public: this is a version of the Master template with less parameters, less outputs, and the bootstrap bucket hardcoded to the publicBucket in config.json
3. various templates in /templates/dev: needed for local testing of the lambda functions.

Run a template test with:

```shell
npm run stack test/{template-name}
```

For example, if you want to test the domain template run:

```shell
npm run stack test/domain
```

To understand the command more run:

```shell
npm run stack -h
```

You also can check a template's syntax with:

```shell
npm run check {template-name}
```

ex.

```shell
npm run check domain
```

To understand the command more run:

```shell
npm check stack -h
```

## Lambda Functions

Lambda functions are found in the /lambda directory. Refer to the README.md file in each directory for instructions on setting up a dev environment and testing.
[Fulfillment](lambda/fulfillment/README.md)
[CFN](lambda/handler/README.md)
[Lex-Build](lambda/lex-build/README.md)
[Import](lambda/import/README.md)

## Web Interface

The Designer UI and client UI code is in the /website directory.

To Test the web ui, Launch a development master stack:

```shell
npm run stack dev/master up
```

when that stack has finished run:

```shell
cd ./website ; make dev
```

this will launch a running webpack process that will watch for changes to files and upload the changes to your running dev/master stack.

