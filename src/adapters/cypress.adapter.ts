import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, ExclusionConfig, AdapterDetectionResult } from './base.js';

export class CypressAdapter extends BaseAdapter {
	name = 'cypress';
	private configFiles = [
		'cypress.config.js',
		'cypress.config.ts',
		'cypress.config.mjs',
		'cypress.json' // Legacy
	];

	async detect(): Promise<AdapterDetectionResult> {
		// Check for Cypress config file
		for (const configFile of this.configFiles) {
			const configPath = path.join(process.cwd(), configFile);
			if (fs.existsSync(configPath)) {
				return {
					detected: true,
					configPath,
					framework: 'cypress'
				};
			}
		}

		// Check package.json for cypress
		const pkgPath = path.join(process.cwd(), 'package.json');
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
				const deps = { ...pkg.dependencies, ...pkg.devDependencies };

				if ('cypress' in deps) {
					return {
						detected: true,
						framework: 'cypress'
					};
				}
			} catch {
				// Ignore parse errors
			}
		}

		return { detected: false };
	}

	getExcludeArgs(exclusions: ExclusionConfig): string[] {
		const args: string[] = [];

		// Combine all exclusions
		const allExclusions = [
			...exclusions.specsToSkip,
			...exclusions.quarantinedSpecs,
			...exclusions.flakySpecs
		];

		// Remove duplicates
		const uniqueExclusions = [...new Set(allExclusions)];

		if (uniqueExclusions.length > 0) {
			// Cypress doesn't have native exclude, so we pass via environment variable
			// Users can read TESTLEDGER_EXCLUDE in their cypress.config.js
			// and add to excludeSpecPattern
			const excludeList = uniqueExclusions.join(',');

			// Pass as environment variable
			args.push('--env', `TESTLEDGER_EXCLUDE=${excludeList}`);
		}

		return args;
	}

	getDefaultCommand(): string[] {
		return ['npx', 'cypress', 'run'];
	}
}
