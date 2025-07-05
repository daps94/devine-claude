import chalk from 'chalk';

export async function cleanCommand(options: { days?: string }): Promise<void> {
  // TODO: Implement clean command
  console.log(chalk.yellow('Clean command not yet implemented'));
  console.log('Days:', options.days || '7');
}
