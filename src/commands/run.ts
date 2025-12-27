import { spawn } from 'child_process';
import { APIClient } from '../api/client.js';
import { getConfig } from '../config/loader.js';
import { detectFramework, getAdapter, ExclusionConfig } from '../adapters/index.js';
import { log, createSpinner, printSkipSummary } from '../utils/logger.js';
import chalk from 'chalk';
import type { Command } from 'commander';

interface RunOptions {
	projectId?: string;
	version?: string;
	apiToken?: string;
	apiUrl?: string;
	flakyMode?: 'skip' | 'warn' | 'fail';
	includeQuarantined?: boolean;
	framework?: string;
	dryRun?: boolean;
}

export async function runCommand(
	options: RunOptions,
	command: Command
): Promise<void> {
	// Check for CLI-provided credentials first
	const cliApiToken = options.apiToken || process.env.TESTLEDGER_API_TOKEN;
	const cliApiUrl = options.apiUrl || process.env.TESTLEDGER_API_URL;

	// Get stored config (will also check env vars)
	const config = getConfig();

	// Determine auth credentials (CLI args > env vars > stored config)
	const apiToken = cliApiToken || config?.apiToken;
	const apiUrl = cliApiUrl || config?.apiUrl;

	if (!apiToken) {
		log.error('Authentication required. Either:');
		log.error('  1. Run "testledger login" to store credentials');
		log.error('  2. Set TESTLEDGER_API_TOKEN env var');
		log.error('  3. Use --api-token flag');
		process.exit(1);
	}

	const projectId = options.projectId
		? parseInt(options.projectId, 10)
		: (process.env.TESTLEDGER_PROJECT_ID ? parseInt(process.env.TESTLEDGER_PROJECT_ID, 10) : config?.projectId);

	if (!projectId) {
		log.error('Project ID is required. Use --project-id <id> or set it with "testledger login"');
		process.exit(1);
	}

	// Get user command (everything after --)
	const userCommand = command.args;

	// Detect or get framework adapter
	let adapter;
	if (options.framework) {
		adapter = getAdapter(options.framework);
		if (!adapter) {
			log.error(`Unknown framework: ${options.framework}. Available: wdio, playwright, cypress`);
			process.exit(1);
		}
	} else {
		const detected = await detectFramework();
		if (!detected) {
			log.error('Could not detect test framework. Use --framework to specify.');
			process.exit(1);
		}
		adapter = detected.adapter;
		log.info(`Detected framework: ${chalk.cyan(adapter.name)}`);
	}

	const spinner = createSpinner('Fetching flaky and quarantined tests...').start();

	try {
		const client = new APIClient(apiUrl, apiToken);
		const flakyMode = options.flakyMode || 'skip';

		// Fetch orchestration config for flaky/quarantine info
		const orchConfig = await client.getOrchestrationConfig(projectId, {
			version: options.version,
			includeFlaky: flakyMode !== 'fail',
			includeQuarantined: !options.includeQuarantined
		});

		spinner.succeed('Fetched test configuration');

		// Handle missing or malformed response
		const skipSpecs = orchConfig.skip_specs || [];
		const counts = orchConfig.counts || { flaky: 0, quarantined: 0 };

		// Build exclusions based on flaky mode
		const exclusions: ExclusionConfig = {
			specsToSkip: [],
			quarantinedSpecs: [],
			flakySpecs: []
		};

		if (flakyMode === 'skip') {
			const flakySpecs = skipSpecs
				.filter(s => s.reason === 'flaky')
				.map(s => s.spec_file);
			exclusions.flakySpecs = flakySpecs;
		}

		// Add quarantined specs (unless --include-quarantined)
		if (!options.includeQuarantined) {
			const quarantinedSpecs = skipSpecs
				.filter(s => s.reason === 'quarantined')
				.map(s => s.spec_file);
			exclusions.quarantinedSpecs = quarantinedSpecs;
		}

		// Print summary
		printSkipSummary(
			counts.flaky,
			counts.quarantined,
			skipSpecs
		);

		// Get framework-specific exclude arguments
		const excludeArgs = adapter.getExcludeArgs(exclusions);

		// Build final command
		const testCommand = userCommand.length > 0
			? userCommand
			: adapter.getDefaultCommand();

		const finalCommand = [...testCommand, ...excludeArgs];

		console.log(chalk.gray(`Running: ${finalCommand.join(' ')}`));
		console.log('');

		// Dry run mode - just show what would happen
		if (options.dryRun) {
			log.info('Dry run mode - not executing tests');
			log.info(`Would run: ${finalCommand.join(' ')}`);
			log.info(`Excluding ${exclusions.flakySpecs.length} flaky specs`);
			log.info(`Excluding ${exclusions.quarantinedSpecs.length} quarantined specs`);
			process.exit(0);
		}

		// Execute the test command
		const [cmd, ...args] = finalCommand;
		const child = spawn(cmd, args, {
			stdio: 'inherit',
			shell: true,
			cwd: process.cwd()
		});

		child.on('close', (code) => {
			// Handle flaky mode warnings
			if (code !== 0 && flakyMode === 'warn') {
				log.warn('Tests failed but running in warn mode - check for flaky tests');
			}

			process.exit(code || 0);
		});

		child.on('error', (error) => {
			log.error(`Failed to start test process: ${error.message}`);
			process.exit(1);
		});

	} catch (error) {
		spinner.fail('Failed to setup test run');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}
