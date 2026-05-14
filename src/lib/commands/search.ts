/**
 * Search & Text Processing Commands (grep, sort, uniq, wc, cut, tr, sed, awk, etc.)
 * 検索・テキスト処理コマンド実装
 */

import { CommandResult, ShellContext } from '../types/command';
import { VirtualFileSystem } from './filesystem';
import { ShellEnvironment } from './environment';

/**
 * grep: パターンマッチング検索
 */
export function grep(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'grep: missing pattern\n',
      exitCode: 1,
      command: 'grep',
    };
  }

  const invert = args[0] === '-v';
  const ignoreCase = args.some((a) => a === '-i');
  const lineNumber = args.some((a) => a === '-n');
  const countOnly = args.some((a) => a === '-c');

  let pattern = invert ? args[1] : args[0];
  const paths = invert ? args.slice(2) : args.slice(1);

  let content = '';

  if (paths.length === 0) {
    // stdin から読取
    content = stdin || '';
  } else {
    // ファイルから読取
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `grep: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'grep',
        };
      }

      content += fileContent;
    }
  }

  const flags = ignoreCase ? 'i' : '';
  let regex: RegExp;

  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return {
      stdout: '',
      stderr: `grep: Invalid pattern: ${pattern}\n`,
      exitCode: 1,
      command: 'grep',
    };
  }

  const lines = content.split('\n');
  let matched: string[] = [];
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isMatch = regex.test(line);

    if ((isMatch && !invert) || (!isMatch && invert)) {
      count++;
      if (lineNumber) {
        matched.push(`${i + 1}:${line}`);
      } else {
        matched.push(line);
      }
    }
  }

  let output = '';
  if (countOnly) {
    output = count.toString() + '\n';
  } else {
    output = matched.join('\n');
    if (matched.length > 0) {
      output += '\n';
    }
  }

  return {
    stdout: output,
    stderr: '',
    exitCode: matched.length > 0 ? 0 : 1,
    command: 'grep',
  };
}

/**
 * sort: 行をソート
 */
export function sort(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  const reverse = args.some((a) => a === '-r');
  const numeric = args.some((a) => a === '-n');
  const paths = args.filter((a) => !a.startsWith('-'));

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `sort: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'sort',
        };
      }

      content += fileContent;
    }
  }

  let lines = content.split('\n').filter((l) => l.length > 0);

  if (numeric) {
    lines.sort((a, b) => parseFloat(a) - parseFloat(b));
  } else {
    lines.sort();
  }

  if (reverse) {
    lines.reverse();
  }

  return {
    stdout: lines.join('\n') + (lines.length > 0 ? '\n' : ''),
    stderr: '',
    exitCode: 0,
    command: 'sort',
  };
}

/**
 * uniq: 重複行削除
 */
export function uniq(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  const count = args.some((a) => a === '-c');
  const paths = args.filter((a) => !a.startsWith('-'));

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `uniq: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'uniq',
        };
      }

      content += fileContent;
    }
  }

  const lines = content.split('\n').filter((l) => l.length > 0);
  const result: string[] = [];
  let currentLine = '';
  let currentCount = 0;

  for (const line of lines) {
    if (line !== currentLine) {
      if (currentLine && currentCount > 0) {
        if (count) {
          result.push(`${currentCount.toString().padStart(7)} ${currentLine}`);
        } else {
          result.push(currentLine);
        }
      }
      currentLine = line;
      currentCount = 1;
    } else {
      currentCount++;
    }
  }

  if (currentLine && currentCount > 0) {
    if (count) {
      result.push(`${currentCount.toString().padStart(7)} ${currentLine}`);
    } else {
      result.push(currentLine);
    }
  }

  return {
    stdout: result.join('\n') + (result.length > 0 ? '\n' : ''),
    stderr: '',
    exitCode: 0,
    command: 'uniq',
  };
}

/**
 * wc: 行数・単語数・バイト数カウント
 */
export function wc(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  const lines_opt = args.some((a) => a === '-l');
  const words_opt = args.some((a) => a === '-w');
  const bytes_opt = args.some((a) => a === '-c');
  const paths = args.filter((a) => !a.startsWith('-'));

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `wc: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'wc',
        };
      }

      content += fileContent;
    }
  }

  const lineCount = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  const wordCount = content.trim().split(/\s+/).length;
  const byteCount = new TextEncoder().encode(content).length;

  let output = '';

  if (!lines_opt && !words_opt && !bytes_opt) {
    // デフォルト: 行数 単語数 バイト数
    output = `${lineCount.toString().padStart(7)} ${wordCount.toString().padStart(7)} ${byteCount.toString().padStart(7)}`;
    if (paths.length > 0) {
      output += ` ${paths[0]}`;
    }
    output += '\n';
  } else {
    if (lines_opt) output += lineCount.toString().padStart(7);
    if (words_opt) output += wordCount.toString().padStart(7);
    if (bytes_opt) output += byteCount.toString().padStart(7);

    if (paths.length > 0) {
      output += ` ${paths[0]}`;
    }
    output += '\n';
  }

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'wc',
  };
}

/**
 * cut: フィールド抽出
 */
export function cut(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  let delimiter = '\t';
  let fields = '1';
  let paths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-d' && i + 1 < args.length) {
      delimiter = args[i + 1];
      i++;
    } else if (args[i].startsWith('-d')) {
      delimiter = args[i].substring(2);
    } else if (args[i] === '-f' && i + 1 < args.length) {
      fields = args[i + 1];
      i++;
    } else if (args[i].startsWith('-f')) {
      fields = args[i].substring(2);
    } else if (!args[i].startsWith('-')) {
      paths.push(args[i]);
    }
  }

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `cut: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'cut',
        };
      }

      content += fileContent;
    }
  }

  const fieldIndexes = parseFieldSelection(fields);
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;

    const parts = line.split(delimiter);
    const selected = fieldIndexes
      .map((i) => parts[i - 1] || '')
      .filter((_, idx) => fieldIndexes[idx]);

    result.push(selected.join(delimiter));
  }

  return {
    stdout: result.join('\n') + (result.length > 0 ? '\n' : ''),
    stderr: '',
    exitCode: 0,
    command: 'cut',
  };
}

function parseFieldSelection(fields: string): number[] {
  const result: number[] = [];
  const parts = fields.split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-');
      const startNum = start ? parseInt(start) : 1;
      const endNum = end ? parseInt(end) : 100;
      for (let i = startNum; i <= endNum; i++) {
        result.push(i);
      }
    } else {
      result.push(parseInt(part));
    }
  }

  return result;
}

/**
 * tr: 文字変換
 */
export function tr(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  if (args.length < 2) {
    return {
      stdout: '',
      stderr: 'tr: missing operand\n',
      exitCode: 1,
      command: 'tr',
    };
  }

  const from = args[0];
  const to = args[1];

  let content = stdin || '';

  // 簡易版: 文字範囲をサポート (a-z, A-Z など)
  const fromChars = expandCharRange(from);
  const toChars = expandCharRange(to);

  let result = '';
  for (const char of content) {
    const index = fromChars.indexOf(char);
    if (index >= 0) {
      result += toChars[index] || toChars[toChars.length - 1];
    } else {
      result += char;
    }
  }

  return {
    stdout: result,
    stderr: '',
    exitCode: 0,
    command: 'tr',
  };
}

function expandCharRange(str: string): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < str.length) {
    if (i + 2 < str.length && str[i + 1] === '-') {
      // 範囲展開
      const start = str.charCodeAt(i);
      const end = str.charCodeAt(i + 2);
      for (let code = start; code <= end; code++) {
        result.push(String.fromCharCode(code));
      }
      i += 3;
    } else {
      result.push(str[i]);
      i++;
    }
  }

  return result;
}

/**
 * sed: ストリーム編集（簡易版：s コマンドのみ）
 */
export function sed(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'sed: missing script\n',
      exitCode: 1,
      command: 'sed',
    };
  }

  const script = args[0];
  const paths = args.slice(1);

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `sed: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'sed',
        };
      }

      content += fileContent;
    }
  }

  // s/pattern/replacement/flags をサポート
  const match = script.match(/^s\/(.+)\/(.+)\/([gi]*)$/);

  if (!match) {
    return {
      stdout: content,
      stderr: '',
      exitCode: 0,
      command: 'sed',
    };
  }

  const pattern = match[1];
  const replacement = match[2];
  const flags = match[3] || '';

  const global = flags.includes('g');
  const ignoreCase = flags.includes('i');

  const regex = new RegExp(pattern, (global ? 'g' : '') + (ignoreCase ? 'i' : ''));
  const result = content.replace(regex, replacement);

  return {
    stdout: result,
    stderr: '',
    exitCode: 0,
    command: 'sed',
  };
}

/**
 * awk: テキスト処理（簡易版）
 */
export function awk(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'awk: missing program\n',
      exitCode: 1,
      command: 'awk',
    };
  }

  const program = args[0];
  const paths = args.slice(1);

  let content = '';

  if (paths.length === 0) {
    content = stdin || '';
  } else {
    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const fileContent = vfs.readFile(absolutePath);

      if (fileContent === null) {
        return {
          stdout: '',
          stderr: `awk: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'awk',
        };
      }

      content += fileContent;
    }
  }

  // {print $1}, {print $2} など簡易版
  const printMatch = program.match(/\{print\s+\$(\d+)\}/);

  if (!printMatch) {
    return {
      stdout: content,
      stderr: '',
      exitCode: 0,
      command: 'awk',
    };
  }

  const fieldNum = parseInt(printMatch[1]);
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;
    const fields = line.split(/\s+/);
    if (fields[fieldNum - 1]) {
      result.push(fields[fieldNum - 1]);
    }
  }

  return {
    stdout: result.join('\n') + (result.length > 0 ? '\n' : ''),
    stderr: '',
    exitCode: 0,
    command: 'awk',
  };
}
