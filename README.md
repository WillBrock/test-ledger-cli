# @testledger/cli

Test orchestration CLI for Test Ledger - automatically skip flaky and quarantined tests.

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
- **WebDriverIO Support**: Full support for WebDriverIO test framework
- **Flaky Mode Options**: Choose to skip, warn, or fail on flaky tests

> **Note:** Playwright and Cypress support coming soon.

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

Run tests with automatic flaky/quarantine test skipping.

```bash
# Basic usage - skip flaky tests
testledger run --project-id 123 -- npx wdio run wdio.conf.js

# With flaky mode options
testledger run --project-id 123 --flaky-mode=skip -- npx wdio   # Skip flaky tests (default)
testledger run --project-id 123 --flaky-mode=warn -- npx wdio   # Run flaky tests, warn on failure
testledger run --project-id 123 --flaky-mode=fail -- npx wdio   # Run flaky tests normally

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
- `--framework <framework>` - Force framework: `wdio`, `playwright`, `cypress`
- `--dry-run` - Show what would be excluded without running tests

## Parallel Execution

For parallel test execution, use your test framework's built-in sharding. The CLI will apply the same flaky/quarantine exclusions to each shard.

### WebDriverIO with Sharding

```bash
# Shard 1 of 3
testledger run --project-id 123 -- npx wdio run wdio.conf.js --shard 1/3

# Shard 2 of 3
testledger run --project-id 123 -- npx wdio run wdio.conf.js --shard 2/3

# Shard 3 of 3
testledger run --project-id 123 -- npx wdio run wdio.conf.js --shard 3/3
```

### GitHub Actions Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]
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
          testledger run --project-id 123 -- npx wdio run wdio.conf.js --shard ${{ matrix.shard }}/3
```

## Framework Support

### WebDriverIO

The CLI automatically detects WebDriverIO projects and uses the `--exclude` flag to skip specs.

```bash
testledger run --project-id 123 -- npx wdio run wdio.conf.js
```

### Playwright (Coming Soon)

Playwright support is planned for a future release.

### Cypress (Coming Soon)

Cypress support is planned for a future release.

## Configuration

Credentials are stored in `~/.config/testledger-cli/config.json` (Linux/Mac) or the appropriate config directory on Windows.

## Environment Variables

- `DEBUG=1` - Enable debug logging

## License

MIT
