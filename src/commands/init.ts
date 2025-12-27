import { log } from '../utils/logger.js';
import { getConfigPath } from '../config/loader.js';

export async function initCommand(): Promise<void> {
	log.info('Test Ledger CLI');
	log.info('');
	log.info('To get started:');
	log.info('  1. Run "testledger login" to authenticate');
	log.info('  2. Run "testledger status" to see your project');
	log.info('  3. Run "testledger run -- <your test command>" to run tests');
	log.info('');
	log.info('For parallel execution:');
	log.info('  1. Create session: testledger orchestrate create --specs="tests/**/*.spec.js" --nodes=3');
	log.info('  2. Run on each CI node: testledger run --parallel --session-id=<id> --node-id=node-1 -- npx wdio');
	log.info('');
	log.info(`Config location: ${getConfigPath()}`);
}
