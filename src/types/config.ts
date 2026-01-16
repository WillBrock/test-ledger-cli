export interface TestLedgerConfig {
	apiUrl: string;
	apiToken: string;
	projectId?: number;
}

// Health status from test_health materialized view
export type HealthStatus = 'healthy' | 'flaky' | 'broken' | 'disabled' | 'insufficient_data';

export interface SkipSpec {
	spec_file: string;
	filepath?: string;
	reason: HealthStatus;
	pass_rate: number;
	fail_rate: number;
	total_runs: number;
	action: 'run' | 'skip';
	skip_ai: boolean;
}

export interface OrchestrationConfigResponse {
	status: string;
	skip_specs: SkipSpec[];
	project_id: number;
	counts: {
		flaky: number;
		broken: number;
		disabled: number;
		skip_ai: number;
		total: number;
	};
}
