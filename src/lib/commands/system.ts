/**
 * System Information & Process Management Commands
 * システム情報・プロセス管理コマンド実装
 */

import { CommandResult, ShellContext } from '../types/command';
import { VirtualFileSystem } from './filesystem';
import { ShellEnvironment } from './environment';

/**
 * whoami: 現在のユーザー名表示
 */
export function whoami(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  return {
    stdout: `${env.currentUser}\n`,
    stderr: '',
    exitCode: 0,
    command: 'whoami',
  };
}

/**
 * id: ユーザー/グループ情報表示
 */
export function id(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const showUser = args.some((a) => a === '-u');
  const showGroup = args.some((a) => a === '-g');
  const showGroups = args.some((a) => a === '-G');

  const uid = env.isSudo ? 0 : 1000;
  const gid = env.isSudo ? 0 : 1000;
  const groups = env.isSudo ? [0] : [1000, 4];

  if (showUser) {
    return {
      stdout: `${uid}\n`,
      stderr: '',
      exitCode: 0,
      command: 'id',
    };
  }

  if (showGroup) {
    return {
      stdout: `${gid}\n`,
      stderr: '',
      exitCode: 0,
      command: 'id',
    };
  }

  if (showGroups) {
    return {
      stdout: `${groups.join(' ')}\n`,
      stderr: '',
      exitCode: 0,
      command: 'id',
    };
  }

  // デフォルト出力
  const groupNames = groups.map((g) => {
    if (g === 0) return 'root';
    if (g === 1000) return 'user';
    if (g === 4) return 'adm';
    return `group${g}`;
  });

  const output =
    `uid=${uid}(${env.isSudo ? 'root' : 'user'}) gid=${gid}(${groupNames[0]}) ` +
    `groups=${groups.map((g, i) => `${g}(${groupNames[i]})`).join(',')}`;

  return {
    stdout: output + '\n',
    stderr: '',
    exitCode: 0,
    command: 'id',
  };
}

/**
 * groups: ユーザーの所属グループ表示
 */
export function groups(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const username = args[0] || env.currentUser;
  const groupList = username === 'root' ? 'root' : 'user adm';

  return {
    stdout: `${groupList}\n`,
    stderr: '',
    exitCode: 0,
    command: 'groups',
  };
}

/**
 * hostname: ホスト名表示
 */
export function hostname(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const iset = args.some((a) => a === '-i');

  if (iset) {
    return {
      stdout: '127.0.0.1\n',
      stderr: '',
      exitCode: 0,
      command: 'hostname',
    };
  }

  return {
    stdout: 'localhost\n',
    stderr: '',
    exitCode: 0,
    command: 'hostname',
  };
}

/**
 * uname: システム情報表示
 */
export function uname(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const all = args.some((a) => a === '-a');
  const kernel = args.some((a) => a === '-s');
  const node = args.some((a) => a === '-n');
  const release = args.some((a) => a === '-r');
  const version = args.some((a) => a === '-v');
  const machine = args.some((a) => a === '-m');

  const parts: string[] = [];

  if (all || kernel) parts.push('Linux');
  if (all || node) parts.push('localhost');
  if (all || release) parts.push('5.15.0-67-generic');
  if (all || version) parts.push('#76-Ubuntu SMP Fri Oct 6 16:25:05 UTC 2023');
  if (all || machine) parts.push('x86_64');

  return {
    stdout: parts.join(' ') + '\n',
    stderr: '',
    exitCode: 0,
    command: 'uname',
  };
}

/**
 * date: 日付・時刻表示
 */
export function date(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const now = new Date();
  const format = args.some((a) => a === '+%Y-%m-%d %H:%M:%S');
  const rfc = args.some((a) => a === '-R');

  if (rfc) {
    return {
      stdout: now.toUTCString() + '\n',
      stderr: '',
      exitCode: 0,
      command: 'date',
    };
  }

  // デフォルト形式
  const defaultFormat = now.toString();

  return {
    stdout: defaultFormat + '\n',
    stderr: '',
    exitCode: 0,
    command: 'date',
  };
}

/**
 * cal: カレンダー表示
 */
export function cal(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 簡易版: 1月のカレンダーのみ表示
  const header = `      ${year}年${month + 1}月\n`;
  const dayHeaders = '日 月 火 水 木 金 土\n';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let calendar = header + dayHeaders;
  let line = '   '.repeat(firstDay);

  for (let day = 1; day <= daysInMonth; day++) {
    line += day.toString().padStart(2, ' ') + ' ';
    if ((firstDay + day) % 7 === 0) {
      calendar += line + '\n';
      line = '';
    }
  }

  if (line) {
    calendar += line + '\n';
  }

  return {
    stdout: calendar,
    stderr: '',
    exitCode: 0,
    command: 'cal',
  };
}

/**
 * uptime: システム稼働時間表示
 */
export function uptime(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const load1 = (Math.random() * 2).toFixed(2);
  const load5 = (Math.random() * 2).toFixed(2);
  const load15 = (Math.random() * 2).toFixed(2);

  const output = ` ${new Date().toLocaleTimeString()} up ${hours}:${minutes}, 1 user, load average: ${load1}, ${load5}, ${load15}\n`;

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'uptime',
  };
}

/**
 * free: メモリ使用状況表示
 */
export function free(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const human = args.some((a) => a === '-h');
  const bytes = args.some((a) => a === '-b');

  let unit = 'ki';
  let divisor = 1024;

  if (human) {
    unit = 'Gi';
    divisor = 1024 * 1024 * 1024;
  }

  if (bytes) {
    unit = '';
    divisor = 1;
  }

  const totalMem = Math.floor(8 * 1024 * 1024 * 1024 / divisor);
  const usedMem = Math.floor(3 * 1024 * 1024 * 1024 / divisor);
  const freeMem = Math.floor(5 * 1024 * 1024 * 1024 / divisor);

  const header = `              total        used        free      shared  buff/cache\n`;
  const memory = `Mem:      ${totalMem.toString().padStart(10)} ${usedMem.toString().padStart(10)} ${freeMem.toString().padStart(10)} ${0} ${0}\n`;

  return {
    stdout: header + memory,
    stderr: '',
    exitCode: 0,
    command: 'free',
  };
}

/**
 * df: ディスク使用状況表示
 */
export function df(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const human = args.some((a) => a === '-h');

  const header = `Filesystem      Size  Used Avail Use% Mounted on\n`;
  const rootfs = `/dev/sda1       100G   50G   50G  50% /\n`;
  const tmpfs = `tmpfs           4.0G     0  4.0G   0% /dev/shm\n`;

  return {
    stdout: header + rootfs + tmpfs,
    stderr: '',
    exitCode: 0,
    command: 'df',
  };
}

/**
 * du: ディレクトリ使用容量表示
 */
export function du(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const summarize = args.some((a) => a === '-s');
  const human = args.some((a) => a === '-h');
  const paths = args.filter((a) => !a.startsWith('-'));

  const path = paths[0] || '.';
  const absolutePath = env.resolvePath(path);

  const stats = vfs.getStats(absolutePath);

  if (!stats) {
    return {
      stdout: '',
      stderr: `du: cannot access '${path}': No such file or directory\n`,
      exitCode: 1,
      command: 'du',
    };
  }

  const size = Math.ceil((stats.size || 0) / 1024);

  return {
    stdout: `${size.toString().padStart(6)} ${path}\n`,
    stderr: '',
    exitCode: 0,
    command: 'du',
  };
}

/**
 * ps: プロセス表示
 */
export function ps(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const aux = args.some((a) => a === 'aux');
  const ef = args.some((a) => a === '-ef');

  const processes = [
    { pid: '1', user: 'root', cpu: '0.0', mem: '0.1', cmd: '/sbin/init' },
    { pid: '100', user: 'root', cpu: '0.1', mem: '0.5', cmd: '/usr/sbin/sshd -D' },
    { pid: '1234', user: 'user', cpu: '0.0', mem: '0.2', cmd: '-bash' },
    { pid: '1235', user: 'user', cpu: '0.1', mem: '0.3', cmd: 'node server.js' },
  ];

  if (aux) {
    let output = 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n';
    for (const proc of processes) {
      output += `${proc.user.padEnd(8)} ${proc.pid.padStart(5)} ${proc.cpu.padStart(4)} ${proc.mem.padStart(4)} 12345  1024 ?        S    10:00   0:00 ${proc.cmd}\n`;
    }
    return { stdout: output, stderr: '', exitCode: 0, command: 'ps' };
  }

  if (ef) {
    let output = 'UID        PID  PPID  C STIME TTY          TIME CMD\n';
    for (const proc of processes) {
      output += `${proc.user.padEnd(8)} ${proc.pid.padStart(6)} ${Math.floor(Math.random() * 10).toString().padStart(6)} 0 10:00 ?            0:00 ${proc.cmd}\n`;
    }
    return { stdout: output, stderr: '', exitCode: 0, command: 'ps' };
  }

  // デフォルト
  let output = '    PID TTY          TIME CMD\n';
  for (const proc of processes) {
    output += `${proc.pid.padStart(6)} ?            0:00 ${proc.cmd}\n`;
  }

  return { stdout: output, stderr: '', exitCode: 0, command: 'ps' };
}

/**
 * top: プロセス監視（簡易版）
 */
export function top(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const output = `
top - 10:00:00 up 5 days, 3:30,  1 user,  load average: 0.15, 0.18, 0.20
Tasks: 120 total,   1 running, 119 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.2 us,  0.8 sy,  0.0 ni, 97.8 id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   8092.5 total,   5012.4 free,   2048.1 used,   1032.0 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   5812.0 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1234 user      20   0  123456  45678  12345 S   5.3   0.5   1:23.45 node
   1235 root      20   0   56789  23456   9876 S   2.1   0.3   0:45.67 sshd
   1236 user      20   0   34567  12345   6789 S   0.5   0.2   0:12.34 bash

(Exiting top - press 'q' to quit or SPACE to continue)
`;

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'top',
  };
}

/**
 * which: コマンドの場所を表示
 */
export function which(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'which: no arguments\n',
      exitCode: 1,
      command: 'which',
    };
  }

  const cmd = args[0];
  const paths = env.PATH.split(':');

  for (const path of paths) {
    const fullPath = `${path}/${cmd}`;
    const stats = vfs.getStats(fullPath);
    if (stats && !stats.isDirectory) {
      return {
        stdout: `${fullPath}\n`,
        stderr: '',
        exitCode: 0,
        command: 'which',
      };
    }
  }

  return {
    stdout: '',
    stderr: `which: ${cmd}: not found\n`,
    exitCode: 1,
    command: 'which',
  };
}

/**
 * type: コマンドの種類表示
 */
export function type(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'type: no arguments\n',
      exitCode: 1,
      command: 'type',
    };
  }

  const cmd = args[0];

  // ビルトイン判定
  const builtins = [
    'cd',
    'pwd',
    'echo',
    'exit',
    'export',
    'alias',
    'unalias',
    'history',
    'jobs',
    'fg',
    'bg',
  ];

  if (builtins.includes(cmd)) {
    return {
      stdout: `${cmd} is a shell builtin\n`,
      stderr: '',
      exitCode: 0,
      command: 'type',
    };
  }

  const result = which(args, context, vfs, env);

  if (result.exitCode === 0) {
    return {
      stdout: `${cmd} is ${result.stdout.trim()}\n`,
      stderr: '',
      exitCode: 0,
      command: 'type',
    };
  }

  return {
    stdout: '',
    stderr: `type: ${cmd}: not found\n`,
    exitCode: 1,
    command: 'type',
  };
}

/**
 * man: マニュアルページ表示（簡易版）
 */
export function man(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'man: what manual page do you want?\n',
      exitCode: 1,
      command: 'man',
    };
  }

  const cmd = args[0];
  const manPages: { [key: string]: string } = {
    ls: `NAME
       ls - list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List information about the FILEs (the current directory by default).

OPTIONS
       -l     use a long listing format
       -a     do not ignore entries starting with .
       -h     print human readable file sizes
       -r     reverse order while sorting
       -R     list subdirectories recursively
       -t     sort by modification time, newest first
`,
    cd: `NAME
       cd - change directory

SYNOPSIS
       cd [DIRECTORY]

DESCRIPTION
       Change the current working directory to DIRECTORY.
       If no argument is given, change to the home directory.
`,
    pwd: `NAME
       pwd - print working directory

SYNOPSIS
       pwd [OPTION]...

DESCRIPTION
       Print the full filename of the current working directory.
`,
  };

  const manual = manPages[cmd] || `No manual entry for ${cmd}\n`;

  return {
    stdout: manual + '\n',
    stderr: '',
    exitCode: 0,
    command: 'man',
  };
}

/**
 * kill: プロセス終了シグナル送信
 */
export function kill(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'kill: no arguments\n',
      exitCode: 1,
      command: 'kill',
    };
  }

  const signal = args[0].startsWith('-') ? args[0].substring(1) : '15';
  const pid = args[args.length - 1];

  // 簡易版: 常に成功
  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: 'kill',
  };
}

/**
 * history: コマンド履歴表示
 */
export function history(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  const historyLines = (env.commandHistory || [])
    .map((cmd, idx) => `${idx + 1.toString().padStart(4)} ${cmd}`)
    .join('\n');

  return {
    stdout: historyLines + (historyLines ? '\n' : ''),
    stderr: '',
    exitCode: 0,
    command: 'history',
  };
}
