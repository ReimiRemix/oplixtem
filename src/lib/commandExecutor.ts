/**
 * Main Command Executor Engine
 * 全コマンド実行エンジン・パイプ・リダイレクト処理
 */

import { CommandResult, ShellContext } from '../types/command';
import { VirtualFileSystem } from './filesystem';
import { ShellEnvironment } from './environment';
import * as builtin from './commands/builtin';
import * as fileops from './commands/fileops';
import * as search from './commands/search';
import * as system from './commands/system';
import * as pkg from './commands/package';

/**
 * パイプ・リダイレクトを考慮したコマンド実行
 */
export class CommandExecutor {
  private vfs: VirtualFileSystem;
  private env: ShellEnvironment;
  private context: ShellContext;

  constructor(
    vfs: VirtualFileSystem,
    env: ShellEnvironment,
    context: ShellContext
  ) {
    this.vfs = vfs;
    this.env = env;
    this.context = context;
  }

  /**
   * コマンド行全体を実行（パイプ・リダイレクト対応）
   */
  execute(commandLine: string): CommandResult {
    // コマンド履歴に追加
    this.env.commandHistory.push(commandLine);

    // パイプ処理
    if (commandLine.includes('|')) {
      return this.executePipe(commandLine);
    }

    // リダイレクト処理
    const redirectMatch = commandLine.match(/^(.+?)\s*(>|>>|<)\s*(.+)$/);
    if (redirectMatch) {
      return this.executeWithRedirect(commandLine);
    }

    // 単一コマンド実行
    return this.executeSingleCommand(commandLine);
  }

  /**
   * 単一コマンド実行
   */
  private executeSingleCommand(commandLine: string): CommandResult {
    const trimmed = commandLine.trim();

    if (!trimmed) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        command: '',
      };
    }

    const parts = this.parseCommandLine(trimmed);
    const cmd = parts[0];
    const args = parts.slice(1);

    return this.executeCommand(cmd, args);
  }

  /**
   * パイプ処理（複数コマンド連鎖）
   */
  private executePipe(commandLine: string): CommandResult {
    const commands = commandLine.split('|').map((s) => s.trim());
    let output = '';

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const parts = this.parseCommandLine(cmd);
      const cmdName = parts[0];
      const args = parts.slice(1);

      let result: CommandResult;

      if (i === 0) {
        // 最初のコマンド
        result = this.executeCommand(cmdName, args);
      } else {
        // パイプされたコマンド
        result = this.executeCommand(cmdName, args, output);
      }

      output = result.stdout;

      if (result.exitCode !== 0) {
        return result;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'pipe',
    };
  }

  /**
   * リダイレクト処理
   */
  private executeWithRedirect(commandLine: string): CommandResult {
    // > (上書き), >> (追記), < (入力)
    const outputMatch = commandLine.match(/^(.+?)\s*>>\s*(.+)$/);
    if (outputMatch) {
      const cmd = outputMatch[1].trim();
      const file = outputMatch[2].trim();
      const result = this.executeSingleCommand(cmd);

      if (result.exitCode === 0) {
        const filePath = this.env.resolvePath(file);
        const currentContent = this.vfs.readFile(filePath) || '';
        this.vfs.writeFile(filePath, currentContent + result.stdout, false);
      }

      return result;
    }

    const outputOverwrite = commandLine.match(/^(.+?)\s*>\s*(.+)$/);
    if (outputOverwrite) {
      const cmd = outputOverwrite[1].trim();
      const file = outputOverwrite[2].trim();
      const result = this.executeSingleCommand(cmd);

      if (result.exitCode === 0) {
        const filePath = this.env.resolvePath(file);
        this.vfs.writeFile(filePath, result.stdout, false);
      }

      return result;
    }

    return this.executeSingleCommand(commandLine);
  }

  /**
   * 実際のコマンド実行
   */
  private executeCommand(
    cmd: string,
    args: string[],
    stdin?: string
  ): CommandResult {
    // 環境変数展開
    args = args.map((arg) => this.env.expandVariables(arg));

    // ビルトインコマンド
    switch (cmd) {
      case 'pwd':
        return builtin.pwd(args, this.context, this.vfs, this.env);

      case 'cd':
        return builtin.cd(args, this.context, this.vfs, this.env);

      case 'ls':
        return builtin.ls(args, this.context, this.vfs, this.env);

      case 'mkdir':
        return builtin.mkdir(args, this.context, this.vfs, this.env);

      case 'rmdir':
        return builtin.rmdir(args, this.context, this.vfs, this.env);

      case 'touch':
        return builtin.touch(args, this.context, this.vfs, this.env);

      case 'cat':
        return builtin.cat(args, this.context, this.vfs, this.env);

      case 'echo':
        return builtin.echo(args, this.context, this.vfs, this.env);

      case 'clear':
        return builtin.clear(args, this.context, this.vfs, this.env);

      case 'exit':
        return builtin.exit(args, this.context, this.vfs, this.env);

      case 'cp':
        return fileops.cp(args, this.context, this.vfs, this.env);

      case 'mv':
        return fileops.mv(args, this.context, this.vfs, this.env);

      case 'rm':
        return fileops.rm(args, this.context, this.vfs, this.env);

      case 'ln':
        return fileops.ln(args, this.context, this.vfs, this.env);

      case 'chmod':
        return fileops.chmod(args, this.context, this.vfs, this.env);

      case 'chown':
        return fileops.chown(args, this.context, this.vfs, this.env);

      case 'find':
        return fileops.find(args, this.context, this.vfs, this.env);

      case 'grep':
        return search.grep(args, this.context, this.vfs, this.env, stdin);

      case 'sort':
        return search.sort(args, this.context, this.vfs, this.env, stdin);

      case 'uniq':
        return search.uniq(args, this.context, this.vfs, this.env, stdin);

      case 'wc':
        return search.wc(args, this.context, this.vfs, this.env, stdin);

      case 'cut':
        return search.cut(args, this.context, this.vfs, this.env, stdin);

      case 'tr':
        return search.tr(args, this.context, this.vfs, this.env, stdin);

      case 'sed':
        return search.sed(args, this.context, this.vfs, this.env, stdin);

      case 'awk':
        return search.awk(args, this.context, this.vfs, this.env, stdin);

      case 'whoami':
        return system.whoami(args, this.context, this.vfs, this.env);

      case 'id':
        return system.id(args, this.context, this.vfs, this.env);

      case 'groups':
        return system.groups(args, this.context, this.vfs, this.env);

      case 'hostname':
        return system.hostname(args, this.context, this.vfs, this.env);

      case 'uname':
        return system.uname(args, this.context, this.vfs, this.env);

      case 'date':
        return system.date(args, this.context, this.vfs, this.env);

      case 'cal':
        return system.cal(args, this.context, this.vfs, this.env);

      case 'uptime':
        return system.uptime(args, this.context, this.vfs, this.env);

      case 'free':
        return system.free(args, this.context, this.vfs, this.env);

      case 'df':
        return system.df(args, this.context, this.vfs, this.env);

      case 'du':
        return system.du(args, this.context, this.vfs, this.env);

      case 'ps':
        return system.ps(args, this.context, this.vfs, this.env);

      case 'top':
        return system.top(args, this.context, this.vfs, this.env);

      case 'which':
        return system.which(args, this.context, this.vfs, this.env);

      case 'type':
        return system.type(args, this.context, this.vfs, this.env);

      case 'man':
        return system.man(args, this.context, this.vfs, this.env);

      case 'kill':
        return system.kill(args, this.context, this.vfs, this.env);

      case 'history':
        return system.history(args, this.context, this.vfs, this.env);

      case 'tar':
        return pkg.tar(args, this.context, this.vfs, this.env, stdin);

      case 'gzip':
        return pkg.gzip(args, this.context, this.vfs, this.env);

      case 'gunzip':
        return pkg.gunzip(args, this.context, this.vfs, this.env);

      case 'zip':
        return pkg.zip(args, this.context, this.vfs, this.env);

      case 'unzip':
        return pkg.unzip(args, this.context, this.vfs, this.env);

      case 'dnf':
        return pkg.dnf(args, this.context, this.vfs, this.env);

      case 'apt':
        return pkg.apt(args, this.context, this.vfs, this.env);

      default:
        return {
          stdout: '',
          stderr: `${cmd}: command not found\n`,
          exitCode: 127,
          command: cmd,
        };
    }
  }

  /**
   * コマンド行をパース（クォート対応）
   */
  private parseCommandLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }
}
