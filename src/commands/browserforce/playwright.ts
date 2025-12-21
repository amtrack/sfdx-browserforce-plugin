import { SfCommand } from '@salesforce/sf-plugins-core';
import { spawn } from 'child_process';

export class BrowserforcePlaywrightCommand extends SfCommand<string> {
  public static description = 'access the Playwright CLI';
  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -- --help`,
    `$ <%= config.bin %> <%= command.id %> -- --version`,
    `$ <%= config.bin %> <%= command.id %> -- install --list`,
    `$ <%= config.bin %> <%= command.id %> -- install chrome`,
  ];

  public static strict = false;

  public async run(): Promise<string> {
    const { argv } = await this.parse(BrowserforcePlaywrightCommand);
    const args = argv as string[];
    const isTest = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test';
    const child = spawn('npx', ['playwright', ...args], {
      stdio: 'pipe',
    });

    return new Promise<string>((resolve, reject) => {
      let stdout = '';
      if (!isTest) {
        child.stdout?.pipe(process.stdout);
        child.stderr?.pipe(process.stderr);
      } else {
        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          process.exit(code || 1);
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}
