import { APIClient } from '../api/client.js';
import { getConfig } from '../config/loader.js';
import { log, createSpinner, formatTable } from '../utils/logger.js';
import chalk from 'chalk';

interface StatusOptions {
	projectId?: string;
	version?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
	const config = getConfig();

	if (!config) {
		log.error('Not logged in. Run "testledger login" first.');
		process.exit(1);
	}

	const projectId = options.projectId
		? parseInt(options.projectId, 10)
		: config.projectId;

	if (!projectId) {
		log.error('Project ID is required. Use --project-id <id>');
		process.exit(1);
	}

	const spinner = createSpinner('Fetching orchestration config...').start();

	try {
		const client = new APIClient();
		const response = await client.getOrchestrationConfig(projectId, {
			version: options.version
		});

		spinner.succeed('Fetched orchestration config');
		console.log('');

		// Handle missing or malformed response
		const skipSpecs = response.skip_specs || [];
		const counts = response.counts || { flaky: 0, quarantined: 0 };

		// Summary
		console.log(chalk.cyan('Project Status'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log(`  Project ID: ${chalk.white(projectId)}`);
		if (options.version) {
			console.log(`  Version:    ${chalk.white(options.version)}`);
		}
		console.log('');

		// Counts
		console.log(chalk.cyan('Test Health'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log(`  ${chalk.yellow('Flaky tests:')}       ${counts.flaky}`);
		console.log(`  ${chalk.red('Quarantined tests:')} ${counts.quarantined}`);
		console.log('');

		// List specs
		if (skipSpecs.length > 0) {
			console.log(chalk.cyan('Specs to Skip'));
			console.log(chalk.gray('─'.repeat(40)));

			const flakySpecs = skipSpecs.filter(s => s.reason === 'flaky');
			const quarantinedSpecs = skipSpecs.filter(s => s.reason === 'quarantined');

			if (flakySpecs.length > 0) {
				console.log(chalk.yellow('\n  Flaky:'));
				for (const spec of flakySpecs.slice(0, 15)) {
					const percent = spec.flaky_percent ? `, ${spec.flaky_percent}%` : '';
					console.log(`    ${chalk.yellow('~')} ${spec.spec_file} (${spec.flaky_count} occurrences${percent})`);
				}
				if (flakySpecs.length > 15) {
					console.log(chalk.gray(`    ... and ${flakySpecs.length - 15} more`));
				}
			}

			if (quarantinedSpecs.length > 0) {
				console.log(chalk.red('\n  Quarantined:'));
				for (const spec of quarantinedSpecs.slice(0, 15)) {
					console.log(`    ${chalk.red('x')} ${spec.spec_file}`);
				}
				if (quarantinedSpecs.length > 15) {
					console.log(chalk.gray(`    ... and ${quarantinedSpecs.length - 15} more`));
				}
			}
		} else {
			console.log(chalk.green('No flaky or quarantined tests found!'));
		}

		console.log('');
	} catch (error) {
		spinner.fail('Failed to fetch status');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}
