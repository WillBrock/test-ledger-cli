# @testledger/cli

Test orchestration CLI for Test Ledger - skip flaky tests, parallel execution, and smart load balancing.

## Installation

```bash
npm install -g @testledger/cli
```

## Quick Start

```bash
# Login with your Test Ledger credentials
testledger login --username your@email.com --api-token YOUR_API_TOKEN

# Check project status (flaky tests, quarantined tests)
testledger status --project-id 123

# Run tests, automatically skipping flaky tests
testledger run --project-id 123 -- npx wdio run wdio.conf.js
```

## Features

- **Skip Flaky Tests**: Automatically skip tests that have been flagged as flaky in Test Ledger
- **Quarantine Tests**: Skip tests that are quarantined/broken
- **Parallel Execution**: Distribute tests across CI nodes with server-side orchestration
- **Load Balancing**: Duration-based load balancing for optimal CI performance
- **Multi-Framework**: Supports WebDriverIO, Playwright, and Cypress

## Commands

### `testledger login`

Authenticate with Test Ledger.

```bash
testledger login --username your@email.com --api-token YOUR_API_TOKEN
```

Options:
- `-u, --username <email>` - Your Test Ledger email
- `-t, --api-token <token>` - Your API token
- `--api-url <url>` - Custom API URL (default: https://app-api.testledger.dev)

### `testledger status`

Show project status including flaky and quarantined tests.

```bash
testledger status --project-id 123
```

Options:
- `-p, --project-id <id>` - Project ID
- `-v, --version <version>` - Filter by app version

### `testledger run`

Run tests with orchestration features.

```bash
# Basic usage - skip flaky tests
testledger run --project-id 123 -- npx wdio run wdio.conf.js

# With flaky mode options
testledger run --project-id 123 --flaky-mode=skip -- npx wdio
testledger run --project-id 123 --flaky-mode=warn -- npx wdio
testledger run --project-id 123 --flaky-mode=fail -- npx wdio

# Include quarantined tests
testledger run --project-id 123 --include-quarantined -- npx wdio

# Dry run (show what would be excluded)
testledger run --project-id 123 --dry-run -- npx wdio
```

Options:
- `-p, --project-id <id>` - Project ID
- `-v, --version <version>` - App version
- `--flaky-mode <mode>` - How to handle flaky tests: `skip`, `warn`, `fail` (default: `skip`)
- `--include-quarantined` - Run quarantined tests anyway
- `--parallel` - Enable server-side orchestration
- `--session-id <id>` - Orchestration session ID (for parallel mode)
- `--node-id <id>` - CI node identifier (for parallel mode)
- `--batch-size <size>` - Number of specs to claim per request (default: 10)
- `--framework <framework>` - Force framework: `wdio`, `playwright`, `cypress`
- `--dry-run` - Show what would be excluded without running tests

### `testledger orchestrate`

Manage parallel test orchestration sessions.

```bash
# Create a new session
testledger orchestrate create --project-id 123 --specs "tests/**/*.spec.js" --nodes 3

# Check session status
testledger orchestrate status <session-id>

# Close a session
testledger orchestrate close <session-id>
```

## Parallel Execution (CI Integration)

### GitHub Actions

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      session_id: ${{ steps.create.outputs.session_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm install -g @testledger/cli
      - name: Create orchestration session
        id: create
        run: |
          testledger login --username ${{ secrets.TESTLEDGER_USER }} --api-token ${{ secrets.TESTLEDGER_TOKEN }}
          testledger orchestrate create --project-id 123 --specs "tests/**/*.spec.js" --nodes 3

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm install -g @testledger/cli
      - name: Run tests
        run: |
          testledger login --username ${{ secrets.TESTLEDGER_USER }} --api-token ${{ secrets.TESTLEDGER_TOKEN }}
          testledger run \
            --project-id 123 \
            --parallel \
            --session-id=${{ needs.setup.outputs.session_id }} \
            --node-id=node-${{ matrix.node }} \
            --flaky-mode=skip \
            -- npx wdio run wdio.conf.js
```

### Jenkins

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g @testledger/cli'
                sh 'testledger login --username $TESTLEDGER_USER --api-token $TESTLEDGER_TOKEN'
                script {
                    def output = sh(
                        script: 'testledger orchestrate create --project-id 123 --specs "tests/**/*.spec.js" --nodes 3',
                        returnStdout: true
                    )
                    env.SESSION_ID = output.find(/session_id::(.+)/) { it[1] }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Node 1') {
                    steps {
                        sh """
                            testledger run \
                                --project-id 123 \
                                --parallel \
                                --session-id=${SESSION_ID} \
                                --node-id=node-1 \
                                -- npx wdio
                        """
                    }
                }
                stage('Node 2') {
                    steps {
                        sh """
                            testledger run \
                                --project-id 123 \
                                --parallel \
                                --session-id=${SESSION_ID} \
                                --node-id=node-2 \
                                -- npx wdio
                        """
                    }
                }
            }
        }
    }
}
```

## Framework Support

### WebDriverIO

The CLI automatically detects WebDriverIO projects and uses the `--exclude` flag to skip specs.

```bash
testledger run --project-id 123 -- npx wdio run wdio.conf.js
```

### Playwright

The CLI uses `--grep-invert` to exclude tests by pattern.

```bash
testledger run --project-id 123 -- npx playwright test
```

### Cypress

The CLI passes exclusions via the `TESTLEDGER_EXCLUDE` environment variable. Add this to your `cypress.config.js`:

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    excludeSpecPattern: process.env.TESTLEDGER_EXCLUDE
      ? process.env.TESTLEDGER_EXCLUDE.split(',')
      : []
  }
});
```

Then run:

```bash
testledger run --project-id 123 -- npx cypress run
```

## Configuration

Credentials are stored in `~/.config/testledger-cli/config.json` (Linux/Mac) or the appropriate config directory on Windows.

## Environment Variables

- `DEBUG=1` - Enable debug logging

## License

MIT
