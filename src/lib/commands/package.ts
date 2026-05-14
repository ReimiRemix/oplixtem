/**
 * Archive & Package Management Commands
 * アーカイブ・パッケージ管理コマンド実装
 */

import { CommandResult, ShellContext } from '../types/command';
import { VirtualFileSystem } from './filesystem';
import { ShellEnvironment } from './environment';

/**
 * tar: ファイルアーカイブ管理
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
      stderr: 'tar: no action specified\n',
      exitCode: 1,
      command: 'tar',
    };
  }

  const options = args[0]; // cvf, xvf など
  const tarFile = args[1];
  const sourceFiles = args.slice(2);

  if (options.includes('c')) {
    // Create archive
    if (!tarFile || sourceFiles.length === 0) {
      return {
        stdout: '',
        stderr: 'tar: must specify both archive and files\n',
        exitCode: 1,
        command: 'tar',
      };
    }

    const tarPath = env.resolvePath(tarFile);
    let tarContent = 'TAR_ARCHIVE\n';

    for (const file of sourceFiles) {
      const filePath = env.resolvePath(file);
      const stats = vfs.getStats(filePath);

      if (!stats) {
        if (options.includes('v')) {
          console.log(`tar: ${file}: No such file or directory`);
        }
        continue;
      }

      if (options.includes('v')) {
        // Verbose output
        console.log(`${file}`);
      }

      const content = vfs.readFile(filePath) || '';
      tarContent += `FILE:${file}\n${content}\nEND_FILE\n`;
    }

    // Create tar archive in VFS
    vfs.writeFile(tarPath, tarContent, false);

    let output = '';
    if (options.includes('v')) {
      for (const file of sourceFiles) {
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

  if (options.includes('x')) {
    // Extract archive
    if (!tarFile) {
      return {
        stdout: '',
        stderr: 'tar: no archive file specified\n',
        exitCode: 1,
        command: 'tar',
      };
    }

    const tarPath = env.resolvePath(tarFile);
    const tarContent = vfs.readFile(tarPath);

    if (!tarContent) {
      return {
        stdout: '',
        stderr: `tar: ${tarFile}: Cannot open: No such file or directory\n`,
        exitCode: 1,
        command: 'tar',
      };
    }

    const files = tarContent.split('FILE:').slice(1);
    let output = '';

    for (const file of files) {
      const [name, ...content] = file.split('\n');
      const fileContent = content
        .join('\n')
        .replace(/\nEND_FILE\n.*/, '')
        .trimEnd();

      const filePath = env.resolvePath(name);
      vfs.writeFile(filePath, fileContent, false);

      if (options.includes('v')) {
        output += `${name}\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'tar',
    };
  }

  if (options.includes('t')) {
    // List archive contents
    if (!tarFile) {
      return {
        stdout: '',
        stderr: 'tar: no archive file specified\n',
        exitCode: 1,
        command: 'tar',
      };
    }

    const tarPath = env.resolvePath(tarFile);
    const tarContent = vfs.readFile(tarPath);

    if (!tarContent) {
      return {
        stdout: '',
        stderr: `tar: ${tarFile}: Cannot open: No such file or directory\n`,
        exitCode: 1,
        command: 'tar',
      };
    }

    const files = tarContent.split('FILE:').slice(1);
    let output = '';

    for (const file of files) {
      const name = file.split('\n')[0];
      output += `${name}\n`;
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
    stderr: 'tar: unrecognized option\n',
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
      stderr: 'gzip: no input file\n',
      exitCode: 1,
      command: 'gzip',
    };
  }

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

  // 簡易版: .gz ファイルを作成して元ファイルを削除
  const gzPath = filePath + '.gz';
  vfs.writeFile(gzPath, `GZIP:${content}`, false);
  vfs.deleteFile(filePath);

  const verbose = args.some((a) => a === '-v');
  let output = '';

  if (verbose) {
    const reduction = Math.floor(content.length * 0.5);
    output = `${args[0]}: 50.0% -- replaced with ${args[0]}.gz\n`;
  }

  return {
    stdout: output,
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
      stderr: 'gunzip: no input file\n',
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

  if (!content.startsWith('GZIP:')) {
    return {
      stdout: '',
      stderr: `gunzip: ${args[0]}: not in gzip format\n`,
      exitCode: 1,
      command: 'gunzip',
    };
  }

  // 簡易版: 元のファイルを復元
  const originalPath = filePath.replace(/\.gz$/, '');
  const originalContent = content.substring(5);
  vfs.writeFile(originalPath, originalContent, false);
  vfs.deleteFile(filePath);

  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: 'gunzip',
  };
}

/**
 * zip: ファイル圧縮（zip形式）
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
      stderr: 'zip: missing arguments\n',
      exitCode: 1,
      command: 'zip',
    };
  }

  const zipFile = env.resolvePath(args[0]);
  const sourceFiles = args.slice(1);

  let zipContent = 'ZIP_ARCHIVE\n';
  let addedFiles = 0;

  for (const file of sourceFiles) {
    const filePath = env.resolvePath(file);
    const content = vfs.readFile(filePath);

    if (content === null) {
      return {
        stdout: '',
        stderr: `zip: ${file}: No such file or directory\n`,
        exitCode: 1,
        command: 'zip',
      };
    }

    zipContent += `FILE:${file}\n${content}\nEND_FILE\n`;
    addedFiles++;
  }

  vfs.writeFile(zipFile, zipContent, false);

  const verbose = args.some((a) => a === '-v');
  let output = '';

  if (verbose) {
    output = `  adding: ${sourceFiles.join(', ')}\n`;
  }

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'zip',
  };
}

/**
 * unzip: ファイル解凍（zip形式）
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
      stderr: 'unzip: missing archive file\n',
      exitCode: 1,
      command: 'unzip',
    };
  }

  const zipFile = env.resolvePath(args[0]);
  const zipContent = vfs.readFile(zipFile);

  if (zipContent === null) {
    return {
      stdout: '',
      stderr: `unzip: cannot find or open ${args[0]}\n`,
      exitCode: 1,
      command: 'unzip',
    };
  }

  if (!zipContent.startsWith('ZIP_ARCHIVE')) {
    return {
      stdout: '',
      stderr: `unzip: ${args[0]}: not a zip file\n`,
      exitCode: 1,
      command: 'unzip',
    };
  }

  const files = zipContent.split('FILE:').slice(1);
  let output = 'Archive: ' + args[0] + '\n';

  for (const file of files) {
    const lines = file.split('\n');
    const name = lines[0];
    const content = lines
      .slice(1)
      .join('\n')
      .replace(/\nEND_FILE\n.*/, '')
      .trimEnd();

    const filePath = env.resolvePath(name);
    vfs.writeFile(filePath, content, false);

    output += `  inflating: ${name}\n`;
  }

  return {
    stdout: output,
    stderr: '',
    exitCode: 0,
    command: 'unzip',
  };
}

/**
 * dnf: パッケージ管理（Fedora/RHEL用、モック）
 */
export function dnf(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: 'usage: dnf [options] COMMAND\n',
      stderr: '',
      exitCode: 0,
      command: 'dnf',
    };
  }

  const command = args[0];

  // モック用パッケージリスト
  const mockPackages: { [key: string]: string } = {
    nginx: '1.24.0-1.fc39.x86_64',
    apache2: '2.4.57-1.fc39.x86_64',
    nodejs: '18.17.0-1.fc39.x86_64',
    python3: '3.11.5-1.fc39.x86_64',
    git: '2.42.0-1.fc39.x86_64',
    curl: '8.3.0-1.fc39.x86_64',
    wget: '1.21.4-1.fc39.x86_64',
    vim: '9.0.1234-1.fc39.x86_64',
    nano: '7.2-1.fc39.x86_64',
    htop: '3.2.2-1.fc39.x86_64',
  };

  if (command === 'search' && args.length > 1) {
    const keyword = args[1];
    let output = 'Searching for packages matching: ' + keyword + '\n\n';

    for (const [pkg, version] of Object.entries(mockPackages)) {
      if (pkg.includes(keyword)) {
        output += `${pkg}.x86_64 : ${version}\n`;
      }
    }

    return {
      stdout: output || 'No matching packages found.\n',
      stderr: '',
      exitCode: 0,
      command: 'dnf',
    };
  }

  if (command === 'install' && args.length > 1) {
    const packages = args.slice(1);
    let output = 'Last metadata expiration check done.\n';

    for (const pkg of packages) {
      if (mockPackages[pkg]) {
        output += `Installing: ${pkg} ${mockPackages[pkg]}\n`;
        output += `Installed: ${pkg}.x86_64 ${mockPackages[pkg]}\n`;
      } else {
        output += `No package ${pkg} available.\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'dnf',
    };
  }

  if (command === 'remove' && args.length > 1) {
    const packages = args.slice(1);
    let output = '';

    for (const pkg of packages) {
      if (mockPackages[pkg]) {
        output += `Removing: ${pkg}\n`;
        output += `Removed: ${pkg}.x86_64\n`;
      } else {
        output += `No package ${pkg} installed.\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'dnf',
    };
  }

  if (command === 'list') {
    let output = 'Installed Packages\n';

    for (const [pkg, version] of Object.entries(mockPackages)) {
      output += `${pkg}.x86_64 ${version}\n`;
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'dnf',
    };
  }

  return {
    stdout: '',
    stderr: `dnf: unknown command '${command}'\n`,
    exitCode: 1,
    command: 'dnf',
  };
}

/**
 * apt: パッケージ管理（Debian/Ubuntu用、モック）
 */
export function apt(
  args: string[],
  context: ShellContext,
  vfs: VirtualFileSystem,
  env: ShellEnvironment
): CommandResult {
  if (args.length === 0) {
    return {
      stdout: 'usage: apt [options] COMMAND\n',
      stderr: '',
      exitCode: 0,
      command: 'apt',
    };
  }

  const command = args[0];

  // モック用パッケージリスト
  const mockPackages: { [key: string]: string } = {
    nginx: '1.24.0-1ubuntu1',
    apache2: '2.4.57-1ubuntu1',
    nodejs: '18.17.0-1nodesource1',
    python3: '3.11.5-1ubuntu1',
    git: '1:2.42.0-1ubuntu1',
    curl: '7.85.0-1ubuntu1',
    wget: '1.21.4-1ubuntu1',
    vim: '2:9.0.1234-1ubuntu1',
    nano: '7.2-1ubuntu1',
    htop: '3.2.2-1ubuntu1',
  };

  if (command === 'search' && args.length > 1) {
    const keyword = args[1];
    let output = `Searching for ${keyword}...\n\n`;

    for (const [pkg, version] of Object.entries(mockPackages)) {
      if (pkg.includes(keyword)) {
        output += `${pkg}/${version} - ${pkg} web server\n`;
      }
    }

    return {
      stdout: output || 'No packages found.\n',
      stderr: '',
      exitCode: 0,
      command: 'apt',
    };
  }

  if (command === 'install' && args.length > 1) {
    const packages = args.slice(1);
    let output = 'Reading package lists... Done\n';
    output += 'Building dependency tree... Done\n\n';

    for (const pkg of packages) {
      if (mockPackages[pkg]) {
        output += `Setting up ${pkg} (${mockPackages[pkg]})...\n`;
      } else {
        output += `Unable to locate package ${pkg}\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'apt',
    };
  }

  if (command === 'remove' && args.length > 1) {
    const packages = args.slice(1);
    let output = '';

    for (const pkg of packages) {
      if (mockPackages[pkg]) {
        output += `Removing ${pkg} (${mockPackages[pkg]})...\n`;
      } else {
        output += `Package ${pkg} is not installed.\n`;
      }
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'apt',
    };
  }

  if (command === 'list') {
    let output = 'Installed packages:\n';

    for (const [pkg, version] of Object.entries(mockPackages)) {
      output += `${pkg}/${version} [installed]\n`;
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      command: 'apt',
    };
  }

  return {
    stdout: '',
    stderr: `apt: command '${command}' not recognized\n`,
    exitCode: 1,
    command: 'apt',
  };
}
