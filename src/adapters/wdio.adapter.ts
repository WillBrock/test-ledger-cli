import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, ExclusionConfig, AdapterDetectionResult } from './base.js';

export class WdioAdapter extends BaseAdapter {
	name = 'webdriverio';
	private configFiles = ['wdio.conf.js', 'wdio.conf.ts', 'wdio.conf.mjs'];

	async detect(): Promise<AdapterDetectionResult> {
		// Check for wdio config file
		for (const configFile of this.configFiles) {
			const configPath = path.join(process.cwd(), configFile);
			if (fs.existsSync(configPath)) {
				return {
					detected: true,
					configPath,
					framework: 'webdriverio'
				};
			}
		}

		// Check package.json for @wdio dependencies
		const pkgPath = path.join(process.cwd(), 'package.json');
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
				const deps = { ...pkg.dependencies, ...pkg.devDependencies };
				const hasWdio = Object.keys(deps).some(d => d.startsWith('@wdio/'));

				if (hasWdio) {
					return {
						detected: true,
						framework: 'webdriverio'
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

		// WDIO supports --exclude flag
		for (const spec of uniqueExclusions) {
			args.push('--exclude', spec);
		}

		return args;
	}

	getDefaultCommand(): string[] {
		// Find the config file
		for (const configFile of this.configFiles) {
			const configPath = path.join(process.cwd(), configFile);
			if (fs.existsSync(configPath)) {
				return ['npx', 'wdio', 'run', configPath];
			}
		}

		return ['npx', 'wdio', 'run', 'wdio.conf.js'];
	}
}
