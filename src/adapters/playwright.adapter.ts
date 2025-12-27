import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, ExclusionConfig, AdapterDetectionResult } from './base.js';

export class PlaywrightAdapter extends BaseAdapter {
	name = 'playwright';
	private configFiles = [
		'playwright.config.ts',
		'playwright.config.js',
		'playwright.config.mjs'
	];

	async detect(): Promise<AdapterDetectionResult> {
		// Check for Playwright config file
		for (const configFile of this.configFiles) {
			const configPath = path.join(process.cwd(), configFile);
			if (fs.existsSync(configPath)) {
				return {
					detected: true,
					configPath,
					framework: 'playwright'
				};
			}
		}

		// Check package.json for @playwright/test
		const pkgPath = path.join(process.cwd(), 'package.json');
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
				const deps = { ...pkg.dependencies, ...pkg.devDependencies };

				if ('@playwright/test' in deps || 'playwright' in deps) {
					return {
						detected: true,
						framework: 'playwright'
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

		// Playwright uses --grep-invert to exclude tests by pattern
		// We need to create a pattern that matches the spec files
		if (uniqueExclusions.length > 0) {
			// For each spec, extract the base name for grep
			for (const spec of uniqueExclusions) {
				const baseName = path.basename(spec, path.extname(spec));
				// Use --ignore to ignore specific files/patterns
				args.push('--ignore-snapshots');
			}

			// A better approach: use environment variable to pass exclusions
			// and read them in playwright.config.ts
			// For now, output as grep-invert patterns
			const pattern = uniqueExclusions
				.map(s => path.basename(s, path.extname(s)))
				.join('|');

			if (pattern) {
				args.push('--grep-invert', pattern);
			}
		}

		return args;
	}

	getDefaultCommand(): string[] {
		return ['npx', 'playwright', 'test'];
	}
}
