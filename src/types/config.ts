export interface TestLedgerConfig {
	apiUrl: string;
	username: string;
	apiToken: string;
	projectId?: number;
}

export interface SkipSpec {
	spec_file: string;
	filepath?: string;
	reason: 'flaky' | 'quarantined';
	flaky_count?: number;
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

export interface OrchestrationSessionResponse {
	status: string;
	session_id: string;
	total_specs_count: number;
	spec_durations: Record<string, number>;
}

export interface ClaimResponse {
	status: string;
	claimed_specs: string[];
	remaining_count: number;
	node_id: string;
	message?: string;
}

export interface SessionStatusResponse {
	status: string;
	session: {
		session_id: string;
		project_id: number;
		total_specs: number;
		claimed_count: number;
		completed_count: number;
		passed_count: number;
		failed_count: number;
		status: string;
		strategy: string;
		created_at: string;
	};
	nodes: Array<{
		node_id: string;
		claimed: number;
		completed: number;
		passed: number;
		failed: number;
	}>;
}
