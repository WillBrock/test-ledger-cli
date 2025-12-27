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
	flakyMode?: 'skip' | 'warn' | 'fail';
	includeQuarantined?: boolean;
	parallel?: boolean;
	sessionId?: string;
	nodeId?: string;
	batchSize?: string;
	framework?: string;
	dryRun?: boolean;
}

export async function runCommand(
	options: RunOptions,
	command: Command
): Promise<void> {
	const config = getConfig();

	if (!config) {
		log.error('Not logged in. Run "testledger login" first.');
		process.exit(1);
	}

	const projectId = options.projectId
		? parseInt(options.projectId, 10)
		: config.projectId;

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

	const spinner = createSpinner('Fetching orchestration config...').start();

	try {
		const client = new APIClient();
		const flakyMode = options.flakyMode || 'skip';

		// Build exclusion config
		const exclusions: ExclusionConfig = {
			specsToSkip: [],
			quarantinedSpecs: [],
			flakySpecs: []
		};

		// In parallel mode, claim specs from session
		let claimedSpecs: string[] = [];
		if (options.parallel) {
			if (!options.sessionId) {
				spinner.fail('--session-id is required for parallel mode');
				process.exit(1);
			}
			if (!options.nodeId) {
				spinner.fail('--node-id is required for parallel mode');
				process.exit(1);
			}

			spinner.text = 'Claiming specs from orchestration session...';
			const batchSize = parseInt(options.batchSize || '10', 10);
			const claimResponse = await client.claimSpecs(
				options.sessionId,
				options.nodeId,
				batchSize
			);

			claimedSpecs = claimResponse.claimed_specs;

			if (claimedSpecs.length === 0) {
				spinner.succeed('No more specs to run');
				log.info('All specs have been claimed by other nodes');
				process.exit(0);
			}

			log.info(`Claimed ${claimedSpecs.length} specs (${claimResponse.remaining_count} remaining)`);
		}

		// Fetch orchestration config for flaky/quarantine info
		const orchConfig = await client.getOrchestrationConfig(projectId, {
			version: options.version,
			includeFlaky: flakyMode !== 'fail',
			includeQuarantined: !options.includeQuarantined
		});

		spinner.succeed('Fetched orchestration config');

		// Build exclusions based on flaky mode
		if (flakyMode === 'skip') {
			const flakySpecs = orchConfig.skip_specs
				.filter(s => s.reason === 'flaky')
				.map(s => s.spec_file);
			exclusions.flakySpecs = flakySpecs;
		}

		// Add quarantined specs (unless --include-quarantined)
		if (!options.includeQuarantined) {
			const quarantinedSpecs = orchConfig.skip_specs
				.filter(s => s.reason === 'quarantined')
				.map(s => s.spec_file);
			exclusions.quarantinedSpecs = quarantinedSpecs;
		}

		// Print summary
		printSkipSummary(
			orchConfig.counts.flaky,
			orchConfig.counts.quarantined,
			orchConfig.skip_specs
		);

		// Get framework-specific exclude arguments
		const excludeArgs = adapter.getExcludeArgs(exclusions);

		// Build final command
		const testCommand = userCommand.length > 0
			? userCommand
			: adapter.getDefaultCommand();

		const finalCommand = [...testCommand, ...excludeArgs];

		// In parallel mode, add spec filter to only run claimed specs
		if (options.parallel && claimedSpecs.length > 0) {
			// For WDIO, we can use --spec to specify which specs to run
			if (adapter.name === 'webdriverio') {
				for (const spec of claimedSpecs) {
					finalCommand.push('--spec', spec);
				}
			}
			// For Playwright, use file arguments
			else if (adapter.name === 'playwright') {
				finalCommand.push(...claimedSpecs);
			}
			// For Cypress, use --spec
			else if (adapter.name === 'cypress') {
				finalCommand.push('--spec', claimedSpecs.join(','));
			}
		}

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

		child.on('close', async (code) => {
			// Report completion in parallel mode
			if (options.parallel && options.sessionId) {
				try {
					for (const spec of claimedSpecs) {
						await client.completeSpec(
							options.sessionId,
							spec,
							code === 0 ? 'passed' : 'failed'
						);
					}
				} catch (error) {
					log.warn('Failed to report completion to orchestration service');
				}
			}

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
