import { glob } from 'glob';
import { APIClient } from '../api/client.js';
import { getConfig } from '../config/loader.js';
import { log, createSpinner } from '../utils/logger.js';
import chalk from 'chalk';

interface CreateOptions {
	projectId?: string;
	version?: string;
	specs?: string;
	nodes?: string;
	strategy?: string;
}

async function create(options: CreateOptions): Promise<void> {
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

	if (!options.specs) {
		log.error('Specs pattern is required. Use --specs <pattern>');
		process.exit(1);
	}

	const spinner = createSpinner('Finding spec files...').start();

	try {
		// Find all spec files matching the pattern
		const specFiles = await glob(options.specs, { nodir: true });

		if (specFiles.length === 0) {
			spinner.fail(`No spec files found matching: ${options.specs}`);
			process.exit(1);
		}

		spinner.text = `Found ${specFiles.length} specs. Creating session...`;

		const client = new APIClient();
		const nodeCount = parseInt(options.nodes || '1', 10);
		const strategy = (options.strategy || 'round_robin') as 'round_robin' | 'duration_based';

		const response = await client.createSession(projectId, specFiles, {
			version: options.version,
			nodeCount,
			strategy
		});

		spinner.succeed('Orchestration session created');
		console.log('');
		console.log(chalk.cyan('Session Details'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log(`  Session ID:   ${chalk.white(response.session_id)}`);
		console.log(`  Total specs:  ${chalk.white(response.total_specs_count)}`);
		console.log(`  Node count:   ${chalk.white(nodeCount)}`);
		console.log(`  Strategy:     ${chalk.white(strategy)}`);
		console.log('');
		console.log(chalk.cyan('Next Steps'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log('  Run on each CI node:');
		console.log(`  ${chalk.green('testledger run --parallel --session-id=' + response.session_id + ' --node-id=node-<N> -- <your test command>')}`);
		console.log('');

		// Output just the session ID for scripting
		console.log(`::set-output name=session_id::${response.session_id}`);
	} catch (error) {
		spinner.fail('Failed to create session');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

async function status(sessionId: string): Promise<void> {
	const config = getConfig();

	if (!config) {
		log.error('Not logged in. Run "testledger login" first.');
		process.exit(1);
	}

	const spinner = createSpinner('Fetching session status...').start();

	try {
		const client = new APIClient();
		const response = await client.getSessionStatus(sessionId);

		spinner.succeed('Fetched session status');
		console.log('');

		const session = response.session;
		const progress = session.total_specs > 0
			? Math.round((session.completed_count / session.total_specs) * 100)
			: 0;

		console.log(chalk.cyan('Session Status'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log(`  Session ID: ${chalk.white(session.session_id)}`);
		console.log(`  Status:     ${chalk.white(session.status)}`);
		console.log(`  Strategy:   ${chalk.white(session.strategy)}`);
		console.log(`  Progress:   ${chalk.white(`${progress}%`)} (${session.completed_count}/${session.total_specs})`);
		console.log('');

		console.log(chalk.cyan('Results'));
		console.log(chalk.gray('─'.repeat(40)));
		console.log(`  ${chalk.green('Passed:')}  ${session.passed_count}`);
		console.log(`  ${chalk.red('Failed:')}  ${session.failed_count}`);
		console.log(`  Claimed: ${session.claimed_count}`);
		console.log('');

		if (response.nodes && response.nodes.length > 0) {
			console.log(chalk.cyan('Node Breakdown'));
			console.log(chalk.gray('─'.repeat(40)));
			for (const node of response.nodes) {
				console.log(`  ${node.node_id}: ${node.completed}/${node.claimed} completed (${chalk.green(node.passed)} passed, ${chalk.red(node.failed)} failed)`);
			}
			console.log('');
		}
	} catch (error) {
		spinner.fail('Failed to fetch session status');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

async function close(sessionId: string): Promise<void> {
	const config = getConfig();

	if (!config) {
		log.error('Not logged in. Run "testledger login" first.');
		process.exit(1);
	}

	const spinner = createSpinner('Closing session...').start();

	try {
		const client = new APIClient();
		await client.closeSession(sessionId);

		spinner.succeed('Session closed');
	} catch (error) {
		spinner.fail('Failed to close session');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

export const orchestrateCommand = {
	create,
	status,
	close
};
