import { getConfig } from '../config/loader.js';
import type { OrchestrationConfigResponse } from '../types/config.js';

export class APIClient {
	private apiUrl: string;
	private authHeader: string;

	constructor(apiUrl?: string, apiToken?: string) {
		// If token provided directly, use it
		if (apiToken) {
			this.apiUrl = apiUrl || 'https://app-api.testledger.dev';
			this.authHeader = `Bearer ${apiToken}`;
			return;
		}

		// Otherwise fall back to config
		const config = getConfig();

		if (!config) {
			throw new Error('Not authenticated. Run "testledger login" first.');
		}

		this.apiUrl = apiUrl || config.apiUrl || 'https://app-api.testledger.dev';
		this.authHeader = `Bearer ${config.apiToken}`;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.apiUrl}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': this.authHeader,
				...options.headers
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API Error (${response.status}): ${error}`);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * Get orchestration config with test health data
	 * Returns specs to skip (flaky/broken/disabled) based on pass rate thresholds
	 */
	async getOrchestrationConfig(
		projectId: number,
		options: {
			version?: string;
			includeFlaky?: boolean;
			includeBroken?: boolean;
			minRuns?: number;
			aiSkipThreshold?: number;
		} = {}
	): Promise<OrchestrationConfigResponse> {
		const params = new URLSearchParams({
			project_id: projectId.toString()
		});

		if (options.version) {
			params.append('version', options.version);
		}
		if (options.includeFlaky !== undefined) {
			params.append('include_flaky', options.includeFlaky.toString());
		}
		if (options.includeBroken !== undefined) {
			params.append('include_broken', options.includeBroken.toString());
		}
		if (options.minRuns !== undefined) {
			params.append('min_runs', options.minRuns.toString());
		}
		if (options.aiSkipThreshold !== undefined) {
			params.append('ai_skip_threshold', options.aiSkipThreshold.toString());
		}

		return this.request<OrchestrationConfigResponse>(
			`/orchestration/config?${params.toString()}`
		);
	}

	/**
	 * Verify credentials by fetching projects
	 */
	async verifyCredentials(): Promise<boolean> {
		try {
			await this.request('/projects');
			return true;
		} catch {
			return false;
		}
	}
}
