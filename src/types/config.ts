export interface TestLedgerConfig {
	apiUrl: string;
	apiToken: string;
	projectId?: number;
}

export interface SkipSpec {
	spec_file: string;
	filepath?: string;
	reason: 'flaky' | 'quarantined';
	flaky_count?: number;
	total_runs?: number;
	run_title?: string;
	version?: string;
}

export interface OrchestrationConfigResponse {
	status: string;
	skip_specs: SkipSpec[];
	project_id: number;
	counts: {
		flaky: number;
		quarantined: number;
	};
}
