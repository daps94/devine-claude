import chalk from 'chalk';

export async function generateCommand(options: { output?: string; model?: string }): Promise<void> {
  // TODO: Implement generate command
  console.log(chalk.yellow('Generate command not yet implemented'));
  console.log('Output:', options.output || 'devine.yml');
  console.log('Model:', options.model || 'opus');
}
