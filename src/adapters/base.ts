export interface ExclusionConfig {
	specsToSkip: string[];
	quarantinedSpecs: string[];
	flakySpecs: string[];
}

export interface AdapterDetectionResult {
	detected: boolean;
	configPath?: string;
	framework?: string;
}

export abstract class BaseAdapter {
	abstract name: string;

	/**
	 * Detect if this adapter applies to the current project
	 */
	abstract detect(): Promise<AdapterDetectionResult>;

	/**
	 * Get framework-specific CLI arguments to exclude specs
	 * Returns an array of arguments to append to the test command
	 */
	abstract getExcludeArgs(exclusions: ExclusionConfig): string[];

	/**
	 * Get the default run command for this framework
	 */
	abstract getDefaultCommand(): string[];
}
