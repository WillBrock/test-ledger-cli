import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { loginCommand } from './commands/login.js';
import { statusCommand } from './commands/status.js';
import { initCommand } from './commands/init.js';

// CLI setup

const program = new Command();

program
	.name('testledger')
	.description('Test orchestration CLI for Test Ledger - skip flaky and quarantined tests')
	.version('1.0.0');

// testledger init
program
	.command('init')
	.description('Initialize Test Ledger configuration')
	.action(initCommand);

// testledger login
program
	.command('login')
	.description('Authenticate with Test Ledger')
	.option('-u, --username <email>', 'Your Test Ledger email')
	.option('-t, --api-token <token>', 'Your API token')
	.option('--api-url <url>', 'Custom API URL (default: https://app-api.testledger.dev)')
	.action(loginCommand);

// testledger status
program
	.command('status')
	.description('Show project status (flaky tests, quarantined tests)')
	.option('-p, --project-id <id>', 'Project ID')
	.option('-v, --version <version>', 'Filter by app version')
	.action(statusCommand);

// testledger run [-- command]
program
	.command('run')
	.description('Run tests, automatically skipping flaky and quarantined tests')
	.option('-p, --project-id <id>', 'Project ID')
	.option('-v, --version <version>', 'App version')
	.option('--flaky-mode <mode>', 'How to handle flaky tests: skip, warn, fail (default: skip)', 'skip')
	.option('--include-quarantined', 'Run quarantined tests anyway', false)
	.option('--framework <framework>', 'Force framework: wdio, playwright, cypress')
	.option('--dry-run', 'Show what would be excluded without running tests', false)
	.allowUnknownOption(true)
	.action(runCommand);

program.parse();
