import { BaseAdapter, AdapterDetectionResult } from './base.js';
import { WdioAdapter } from './wdio.adapter.js';
import { PlaywrightAdapter } from './playwright.adapter.js';
import { CypressAdapter } from './cypress.adapter.js';

// Register all adapters
const adapters: BaseAdapter[] = [
	new WdioAdapter(),
	new PlaywrightAdapter(),
	new CypressAdapter()
];

export interface DetectedAdapter {
	adapter: BaseAdapter;
	detection: AdapterDetectionResult;
}

/**
 * Auto-detect the test framework in the current project
 */
export async function detectFramework(): Promise<DetectedAdapter | null> {
	for (const adapter of adapters) {
		const detection = await adapter.detect();
		if (detection.detected) {
			return { adapter, detection };
		}
	}
	return null;
}

/**
 * Get a specific adapter by name
 */
export function getAdapter(name: string): BaseAdapter | null {
	const normalized = name.toLowerCase();

	// Handle aliases
	const aliases: Record<string, string> = {
		'wdio': 'webdriverio',
		'pw': 'playwright',
		'cy': 'cypress'
	};

	const adapterName = aliases[normalized] || normalized;

	return adapters.find(a => a.name === adapterName) || null;
}

/**
 * List all available adapters
 */
export function listAdapters(): string[] {
	return adapters.map(a => a.name);
}

export { BaseAdapter, ExclusionConfig } from './base.js';
