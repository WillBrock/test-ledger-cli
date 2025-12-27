import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const log = {
	info: (message: string) => console.log(chalk.blue('info'), message),
	success: (message: string) => console.log(chalk.green('success'), message),
	warn: (message: string) => console.log(chalk.yellow('warn'), message),
	error: (message: string) => console.log(chalk.red('error'), message),
	debug: (message: string) => {
		if (process.env.DEBUG) {
			console.log(chalk.gray('debug'), message);
		}
	}
};

export function createSpinner(text: string): Ora {
	return ora({ text, color: 'cyan' });
}

export function formatTable(
	headers: string[],
	rows: string[][]
): string {
	// Calculate column widths
	const widths = headers.map((h, i) =>
		Math.max(h.length, ...rows.map(r => (r[i] || '').length))
	);

	// Format header
	const headerLine = headers
		.map((h, i) => h.padEnd(widths[i]))
		.join('  ');
	const separator = widths.map(w => '-'.repeat(w)).join('  ');

	// Format rows
	const formattedRows = rows.map(row =>
		row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  ')
	);

	return [headerLine, separator, ...formattedRows].join('\n');
}

export function printSkipSummary(
	flakyCount: number,
	quarantinedCount: number,
	specs: Array<{ spec_file: string; reason: string }>
): void {
	console.log('');
	console.log(chalk.cyan('Test Ledger Orchestration Summary'));
	console.log(chalk.gray('─'.repeat(40)));

	if (flakyCount > 0) {
		console.log(chalk.yellow(`  Flaky tests to skip: ${flakyCount}`));
	}
	if (quarantinedCount > 0) {
		console.log(chalk.red(`  Quarantined tests:   ${quarantinedCount}`));
	}

	if (specs.length > 0) {
		console.log('');
		console.log(chalk.gray('  Specs to exclude:'));
		for (const spec of specs.slice(0, 10)) {
			const icon = spec.reason === 'flaky' ? chalk.yellow('~') : chalk.red('x');
			console.log(`    ${icon} ${spec.spec_file}`);
		}
		if (specs.length > 10) {
			console.log(chalk.gray(`    ... and ${specs.length - 10} more`));
		}
	}

	console.log('');
}
