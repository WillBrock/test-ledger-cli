import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { loginCommand } from './commands/login.js';
import { statusCommand } from './commands/status.js';
import { orchestrateCommand } from './commands/orchestrate.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
	.name('testledger')
	.description('Test orchestration CLI for Test Ledger')
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
	.description('Run tests with orchestration (skip flaky, parallel execution)')
	.option('-p, --project-id <id>', 'Project ID')
	.option('-v, --version <version>', 'App version')
	.option('--flaky-mode <mode>', 'How to handle flaky tests: skip, warn, fail (default: skip)', 'skip')
	.option('--include-quarantined', 'Run quarantined tests anyway', false)
	.option('--parallel', 'Enable server-side orchestration for parallel execution', false)
	.option('--session-id <id>', 'Orchestration session ID (for parallel mode)')
	.option('--node-id <id>', 'CI node identifier (for parallel mode)')
	.option('--batch-size <size>', 'Number of specs to claim per request (default: 10)', '10')
	.option('--framework <framework>', 'Force framework: wdio, playwright, cypress')
	.option('--dry-run', 'Show what would be excluded without running tests', false)
	.allowUnknownOption(true)
	.action(runCommand);

// testledger orchestrate
const orchestrate = program
	.command('orchestrate')
	.description('Manage parallel test orchestration sessions');

orchestrate
	.command('create')
	.description('Create a new orchestration session')
	.option('-p, --project-id <id>', 'Project ID')
	.option('-v, --version <version>', 'App version')
	.option('-s, --specs <pattern>', 'Glob pattern for spec files (e.g., "tests/**/*.spec.js")')
	.option('-n, --nodes <count>', 'Number of CI nodes', '1')
	.option('--strategy <strategy>', 'Distribution strategy: round_robin, duration_based', 'round_robin')
	.action(orchestrateCommand.create);

orchestrate
	.command('status <session-id>')
	.description('Check status of an orchestration session')
	.action(orchestrateCommand.status);

orchestrate
	.command('close <session-id>')
	.description('Close an orchestration session')
	.action(orchestrateCommand.close);

program.parse();
