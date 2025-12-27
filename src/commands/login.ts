import { setConfig, getConfigPath } from '../config/loader.js';
import { APIClient } from '../api/client.js';
import { log, createSpinner } from '../utils/logger.js';

interface LoginOptions {
	username?: string;
	apiToken?: string;
	apiUrl?: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
	const { username, apiToken, apiUrl } = options;

	if (!username) {
		log.error('Username is required. Use --username <email>');
		process.exit(1);
	}

	if (!apiToken) {
		log.error('API token is required. Use --api-token <token>');
		process.exit(1);
	}

	const spinner = createSpinner('Verifying credentials...').start();

	try {
		// Verify credentials work
		const client = new APIClient(apiUrl, username, apiToken);
		const valid = await client.verifyCredentials();

		if (!valid) {
			spinner.fail('Invalid credentials');
			process.exit(1);
		}

		// Store credentials
		setConfig({
			username,
			apiToken,
			apiUrl: apiUrl || 'https://app-api.testledger.dev'
		});

		spinner.succeed('Logged in successfully');
		log.info(`Credentials saved to: ${getConfigPath()}`);
	} catch (error) {
		spinner.fail('Login failed');
		log.error(error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}
