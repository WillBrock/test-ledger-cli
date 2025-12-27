import { getConfig } from '../config/loader.js';
import type {
	OrchestrationConfigResponse,
	OrchestrationSessionResponse,
	ClaimResponse,
	SessionStatusResponse
} from '../types/config.js';

export class APIClient {
	private apiUrl: string;
	private authHeader: string;

	constructor(apiUrl?: string, username?: string, apiToken?: string) {
		const config = getConfig();

		if (!config && (!username || !apiToken)) {
			throw new Error('Not authenticated. Run "testledger login" first.');
		}

		this.apiUrl = apiUrl || config?.apiUrl || 'https://app-api.testledger.dev';
		const user = username || config?.username || '';
		const token = apiToken || config?.apiToken || '';

		// Basic auth: base64(username:apiToken)
		this.authHeader = `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`;
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
	 * Get orchestration config (flaky + quarantined specs to skip)
	 */
	async getOrchestrationConfig(
		projectId: number,
		options: {
			version?: string;
			includeFlaky?: boolean;
			includeQuarantined?: boolean;
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
		if (options.includeQuarantined !== undefined) {
			params.append('include_quarantined', options.includeQuarantined.toString());
		}

		return this.request<OrchestrationConfigResponse>(
			`/orchestration/config?${params.toString()}`
		);
	}

	/**
	 * Create orchestration session for parallel execution
	 */
	async createSession(
		projectId: number,
		specs: string[],
		options: {
			version?: string;
			nodeCount?: number;
			strategy?: 'round_robin' | 'duration_based';
		} = {}
	): Promise<OrchestrationSessionResponse> {
		return this.request<OrchestrationSessionResponse>('/orchestration/session', {
			method: 'POST',
			body: JSON.stringify({
				project_id: projectId,
				total_specs: specs,
				version: options.version,
				node_count: options.nodeCount || 1,
				strategy: options.strategy || 'round_robin'
			})
		});
	}

	/**
	 * Claim a batch of specs for parallel execution
	 */
	async claimSpecs(
		sessionId: string,
		nodeId: string,
		batchSize: number = 10
	): Promise<ClaimResponse> {
		return this.request<ClaimResponse>('/orchestration/claim', {
			method: 'POST',
			body: JSON.stringify({
				session_id: sessionId,
				node_id: nodeId,
				batch_size: batchSize
			})
		});
	}

	/**
	 * Mark a spec as completed
	 */
	async completeSpec(
		sessionId: string,
		specFile: string,
		result: 'passed' | 'failed' | 'skipped',
		duration?: number
	): Promise<{ status: string }> {
		return this.request('/orchestration/complete', {
			method: 'POST',
			body: JSON.stringify({
				session_id: sessionId,
				spec_file: specFile,
				result,
				duration
			})
		});
	}

	/**
	 * Get session status
	 */
	async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
		return this.request<SessionStatusResponse>(
			`/orchestration/status/${sessionId}`
		);
	}

	/**
	 * Close orchestration session
	 */
	async closeSession(sessionId: string): Promise<{ status: string }> {
		return this.request(`/orchestration/session/${sessionId}/close`, {
			method: 'POST'
		});
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
