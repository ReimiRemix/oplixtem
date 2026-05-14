/**
 * Archive & Package Management Commands
 * アーカイブ・パッケージ管理コマンド実装
 */

import { CommandResult, ShellContext } from '../types/command';
import { VirtualFileSystem } from './filesystem';
import { ShellEnvironment } from './environment';

/**
 * tar: アーカイブ作成・抽出
 */
export function tar(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment,
  stdin?: string
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'tar: missing operand\n',
      exitCode: 1,
      command: 'tar',
    };
  }

  const create = args.some((a) => a === 'c' || a === '-c' || a.includes('c'));
  const extract = args.some((a) => a === 'x' || a === '-x' || a.includes('x'));
  const verbose = args.some((a) => a === 'v' || a === '-v' || a.includes('v'));
  const file_opt = args.some((a) => a === 'f' || a === '-f' || a.includes('f'));
  const gzip = args.some((a) => a === 'z' || a === '-z' || a.includes('z'));

  // ファイル名を取得
  let tarFile = '';
  let paths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (
      file_opt &&
      !arg.startsWith('-') &&
      !arg.includes('c') &&
      !arg.includes('x')
    ) {
      if (!tarFile) {
        tarFile = arg;
      } else {
        paths.push(arg);
      }
    } else if (
      !arg.startsWith('-') &&
      !arg.includes('c') &&
      !arg.includes('x') &&
      !arg.includes('v') &&
      !arg.includes('f') &&
      !arg.includes('z')
    ) {
      paths.push(arg);
    }
  }

  if (create) {
    // アーカイブ作成
    if (!tarFile) {
      return {
        stdout: '',
        stderr: 'tar: must specify archive name\n',
        exitCode: 1,
        command: 'tar',
      };
    }

    const tarPath = env.resolvePath(tarFile);
    let archiveContent = '';

    for (const pathArg of paths) {
      const absolutePath = env.resolvePath(pathArg);
      const stats = vfs.getStats(absolutePath);

      if (!stats) {
        return {
          stdout: '',
          stderr: `tar: ${pathArg}: No such file or directory\n`,
          exitCode: 1,
          command: 'tar',
        };
      }

      if (verbose) {
        archiveContent += `${pathArg}\n`;
      }

      const content = vfs.readFile(absolutePath);
      if (content !== null) {
        archiveContent += content;
      }
    }

    vfs.writeFile(tarPath, archiveContent, false);

    let output = '';
    if (verbose) {
      for (const path of paths) {
        output += `${path}\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'tar',
    };
  }

  if (extract) {
    // アーカイブ抽出
    if (!tarFile) {
      return {
        stdout: '',
        stderr: 'tar: must specify archive name\n',
        exitCode: 1,
        command: 'tar',
      };
    }

    const tarPath = env.resolvePath(tarFile);
    const content = vfs.readFile(tarPath);

    if (content === null) {
      return {
        stdout: '',
        stderr: `tar: ${tarFile}: No such file or directory\n`,
        exitCode: 1,
        command: 'tar',
      };
    }

    // 簡易版: ファイルを適当に分割
    const files = content.split('\n').filter((f) => f.length > 0);
    let output = '';

    for (const file of files) {
      vfs.touch(file);
      if (verbose) {
        output += `${file}\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'tar',
    };
  }

  return {
    stdout: '',
    stderr: 'tar: must specify either c or x option\n',
    exitCode: 1,
    command: 'tar',
  };
}

/**
 * gzip: ファイル圧縮
 */
export function gzip(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'gzip: no files specified\n',
      exitCode: 1,
      command: 'gzip',
    };
  }

  const keep = args.some((a) => a === '-k');
  const filePath = env.resolvePath(args[0]);

  const content = vfs.readFile(filePath);

  if (content === null) {
    return {
      stdout: '',
      stderr: `gzip: ${args[0]}: No such file or directory\n`,
      exitCode: 1,
      command: 'gzip',
    };
  }

  // 簡易版: ファイル名に .gz 追加
  const gzipPath = filePath + '.gz';
  const compressed = `GZIP::${content.length}::${content.substring(0, 50)}...`;

  vfs.writeFile(gzipPath, compressed, false);

  if (!keep) {
    // 元ファイルを削除（実装簡略化）
    vfs.deleteFile(filePath);
  }

  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: 'gzip',
  };
}

/**
 * gunzip: ファイル解凍
 */
export function gunzip(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'gunzip: no files specified\n',
      exitCode: 1,
      command: 'gunzip',
    };
  }

  const filePath = env.resolvePath(args[0]);
  const content = vfs.readFile(filePath);

  if (content === null) {
    return {
      stdout: '',
      stderr: `gunzip: ${args[0]}: No such file or directory\n`,
      exitCode: 1,
      command: 'gunzip',
    };
  }

  if (!content.startsWith('GZIP::')) {
    return {
      stdout: '',
      stderr: `gunzip: ${args[0]}: not a gzip file\n`,
      exitCode: 1,
      command: 'gunzip',
    };
  }

  // 簡易版: .gz 拡張子を除去
  const originalPath = filePath.endsWith('.gz')
    ? filePath.substring(0, filePath.length - 3)
    : filePath;

  const decompressed = content.replace(/^GZIP::\d+::/, '');
  vfs.writeFile(originalPath, decompressed, false);
  vfs.deleteFile(filePath);

  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: 'gunzip',
  };
}

/**
 * zip: ファイル圧縮（ZIP形式）
 */
export function zip(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length < 2) {
    return {
      stdout: '',
      stderr: 'zip: require at least 2 arguments\n',
      exitCode: 1,
      command: 'zip',
    };
  }

  const zipFile = env.resolvePath(args[0]);
  const files = args.slice(1).map((f) => env.resolvePath(f));

  let archiveContent = '';

  for (const file of files) {
    const content = vfs.readFile(file);

    if (content !== null) {
      archiveContent += `ZIP_ENTRY::${file}::${content}\n`;
    }
  }

  vfs.writeFile(zipFile, archiveContent, false);

  return {
    stdout: `  adding: ${files.join('...')}\n`,
    stderr: '',
    exitCode: 0,
    command: 'zip',
  };
}

/**
 * unzip: ZIP ファイル解凍
 */
export function unzip(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: '',
      stderr: 'unzip: no files specified\n',
      exitCode: 1,
      command: 'unzip',
    };
  }

  const zipPath = env.resolvePath(args[0]);
  const content = vfs.readFile(zipPath);

  if (content === null) {
    return {
      stdout: '',
      stderr: `unzip: ${args[0]}: No such file or directory\n`,
      exitCode: 1,
      command: 'unzip',
    };
  }

  const entries = content.split('\n').filter((e) => e.startsWith('ZIP_ENTRY::'));
  let output = 'Archive:  ' + args[0] + '\n';

  for (const entry of entries) {
    const match = entry.match(/^ZIP_ENTRY::(.+?)::(.+)$/);
    if (match) {
      const [, filePath, fileContent] = match;
      vfs.writeFile(env.resolvePath(filePath), fileContent, false);
      output += `  inflating: ${filePath}\n`;
    }
  }

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'unzip',
  };
}

/**
 * dnf: パッケージ管理（モック版）
 */
export function dnf(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: 'dnf: no command specified\n',
      stderr: '',
      exitCode: 1,
      command: 'dnf',
    };
  }

  const subcmd = args[0];
  const package_name = args[1] || '';

  // モック用パッケージリスト
  const packages: { [key: string]: { version: string; repo: string } } = {
    'nginx': { version: '1.24.0', repo: 'appstream' },
    'git': { version: '2.41.0', repo: 'appstream' },
    'python3': { version: '3.11.5', repo: 'appstream' },
    'nodejs': { version: '18.18.0', repo: 'appstream' },
    'docker': { version: '24.0.6', repo: 'docker-ce' },
    'curl': { version: '8.3.0', repo: 'appstream' },
    'wget': { version: '1.21.4', repo: 'appstream' },
  };

  switch (subcmd) {
    case 'search':
      let output = '';
      for (const [name, info] of Object.entries(packages)) {
        if (name.includes(package_name)) {
          output += `${name}.x86_64 : Package search\n  Repository: ${info.repo}\n  Version   : ${info.version}\n\n`;
        }
      }
      return {
        stdout: output || `No matches for ${package_name}\n`,
        stderr: '',
        exitCode: 0,
        command: 'dnf',
      };

    case 'list':
      let listOutput = 'Installed Packages\n';
      for (const [name, info] of Object.entries(packages)) {
        listOutput += `${name}.x86_64 ${info.version} ${info.repo}\n`;
      }
      return {
        stdout: listOutput,
        stderr: '',
        exitCode: 0,
        command: 'dnf',
      };

    case 'install':
      if (!package_name) {
        return {
          stdout: '',
          stderr: 'dnf: no package specified\n',
          exitCode: 1,
          command: 'dnf',
        };
      }

      if (packages[package_name]) {
        return {
          stdout: `Installed: ${package_name}-${packages[package_name].version}\n`,
          stderr: '',
          exitCode: 0,
          command: 'dnf',
        };
      }

      return {
        stdout: '',
        stderr: `No package matching '${package_name}' found.\n`,
        exitCode: 1,
        command: 'dnf',
      };

    case 'remove':
      if (!package_name) {
        return {
          stdout: '',
          stderr: 'dnf: no package specified\n',
          exitCode: 1,
          command: 'dnf',
        };
      }

      return {
        stdout: `Removed: ${package_name}\n`,
        stderr: '',
        exitCode: 0,
        command: 'dnf',
      };

    default:
      return {
        stdout: '',
        stderr: `dnf: unknown subcommand '${subcmd}'\n`,
        exitCode: 1,
        command: 'dnf',
      };
  }
}

/**
 * apt: パッケージ管理（Debian/Ubuntu モック版）
 */
export function apt(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: 'apt: no command specified\n',
      stderr: '',
      exitCode: 1,
      command: 'apt',
    };
  }

  const subcmd = args[0];
  const package_name = args[1] || '';

  // モック用パッケージリスト
  const packages: { [key: string]: { version: string; origin: string } } = {
    'nginx': { version: '1.24.1', origin: 'Ubuntu' },
    'git': { version: '1:2.41.0-1', origin: 'Ubuntu' },
    'python3': { version: '3.11.5-1', origin: 'Ubuntu' },
    'nodejs': { version: '18.18.0', origin: 'NodeSource' },
    'docker.io': { version: '24.0.6-1', origin: 'Docker' },
    'curl': { version: '8.3.0-1', origin: 'Ubuntu' },
    'wget': { version: '1.21.4-1', origin: 'Ubuntu' },
  };

  switch (subcmd) {
    case 'search':
      let output = '';
      for (const [name, info] of Object.entries(packages)) {
        if (name.includes(package_name)) {
          output += `${name}/jammy 1.0.0 amd64\n  Description: Package for ${name}\n`;
        }
      }
      return {
        stdout: output || `No packages matching '${package_name}'\n`,
        stderr: '',
        exitCode: 0,
        command: 'apt',
      };

    case 'list':
      let listOutput = 'Listing...\n';
      for (const [name, info] of Object.entries(packages)) {
        listOutput += `${name}/${info.origin} ${info.version}\n`;
      }
      return {
        stdout: listOutput,
        stderr: '',
        exitCode: 0,
        command: 'apt',
      };

    case 'install':
      if (!package_name) {
        return {
          stdout: '',
          stderr: 'apt: no package specified\n',
          exitCode: 1,
          command: 'apt',
        };
      }

      if (packages[package_name]) {
        return {
          stdout: `Setting up ${package_name} (${packages[package_name].version}) ...\n`,
          stderr: '',
          exitCode: 0,
          command: 'apt',
        };
      }

      return {
        stdout: '',
        stderr: `Unable to locate package ${package_name}\n`,
        exitCode: 1,
        command: 'apt',
      };

    case 'remove':
      if (!package_name) {
        return {
          stdout: '',
          stderr: 'apt: no package specified\n',
          exitCode: 1,
          command: 'apt',
        };
      }

      return {
        stdout: `Removing ${package_name}...\n`,
        stderr: '',
        exitCode: 0,
        command: 'apt',
      };

    default:
      return {
        stdout: '',
        stderr: `apt: unknown subcommand '${subcmd}'\n`,
        exitCode: 1,
        command: 'apt',
      };
  }
}
