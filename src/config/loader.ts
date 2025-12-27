import Conf from 'conf';
import type { TestLedgerConfig } from '../types/config.js';

const DEFAULT_API_URL = 'https://app-api.testledger.dev';

interface StoredConfig {
	apiUrl?: string;
	apiToken?: string;
	projectId?: number;
}

const config = new Conf<StoredConfig>({
	projectName: 'testledger-cli',
	schema: {
		apiUrl: {
			type: 'string',
			default: DEFAULT_API_URL
		},
		apiToken: {
			type: 'string'
		},
		projectId: {
			type: 'number'
		}
	}
});

export function getConfig(): TestLedgerConfig | null {
	// Check environment variables first (for CI environments)
	const envApiToken = process.env.TESTLEDGER_API_TOKEN;
	const envProjectId = process.env.TESTLEDGER_PROJECT_ID;
	const envApiUrl = process.env.TESTLEDGER_API_URL;

	// If env var is set, use it
	if (envApiToken) {
		return {
			apiUrl: envApiUrl || DEFAULT_API_URL,
			apiToken: envApiToken,
			projectId: envProjectId ? parseInt(envProjectId, 10) : undefined
		};
	}

	// Fall back to stored config
	const apiToken = config.get('apiToken');

	if (!apiToken) {
		return null;
	}

	return {
		apiUrl: config.get('apiUrl') || DEFAULT_API_URL,
		apiToken,
		projectId: config.get('projectId')
	};
}

export function setConfig(newConfig: Partial<TestLedgerConfig>): void {
	if (newConfig.apiUrl) config.set('apiUrl', newConfig.apiUrl);
	if (newConfig.apiToken) config.set('apiToken', newConfig.apiToken);
	if (newConfig.projectId) config.set('projectId', newConfig.projectId);
}

export function clearConfig(): void {
	config.clear();
}

export function getConfigPath(): string {
	return config.path;
}

export function isAuthenticated(): boolean {
	const cfg = getConfig();
	return cfg !== null && !!cfg.apiToken;
}
