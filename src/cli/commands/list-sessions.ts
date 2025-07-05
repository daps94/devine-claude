import chalk from 'chalk';
import Table from 'cli-table3';
import { SessionPath } from '../../core/sessionPath';
import { parseSessionId } from '../../utils/system';

export async function listSessionsCommand(options: { limit?: string }): Promise<void> {
  const limit = parseInt(options.limit || '10', 10);
  const sessions = SessionPath.listSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('No Devine sessions found'));
    return;
  }

  // Create table
  const table = new Table({
    head: ['SESSION_ID', 'CREATED', 'MAIN_INSTANCE', 'INSTANCES', 'CONFIG_FILE'],
    style: {
      head: ['cyan'],
    },
  });

  // Take only the requested number of sessions
  const displaySessions = sessions.slice(0, limit);

  displaySessions.forEach((session) => {
    const created = parseSessionId(session.timestamp);
    const metadata = session.metadata;

    table.push([
      session.timestamp,
      created ? created.toLocaleString() : 'Unknown',
      metadata?.mainInstance || 'Unknown',
      metadata ? Object.keys(metadata.instances).length.toString() : '0',
      metadata?.configFile || 'Unknown',
    ]);
  });

  console.log(table.toString());

  if (sessions.length > limit) {
    console.log(
      chalk.gray(`\nShowing ${limit} of ${sessions.length} sessions. Use --limit to see more.`),
    );
  }

  console.log(
    chalk.gray(
      `\nSession paths: ${SessionPath.getCurrentSymlinkPath()}/sessions/{project}/{session_id}`,
    ),
  );
}
