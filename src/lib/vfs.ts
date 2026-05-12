export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  content?: string;
  children?: { [key: string]: FileNode };
  permissions: string;
  owner: string;
  group: string;
  size: number;
  updatedAt: Date;
}

export class VirtualFileSystem {
  root: FileNode;
  
  constructor() {
    this.root = {
      name: '/',
      type: 'dir',
      children: {},
      permissions: 'drwxr-xr-x',
      owner: 'root',
      group: 'root',
      size: 4096,
      updatedAt: new Date(),
    };
    
    // Create basic structure
    this.mkdir('/home');
    this.mkdir('/home/user');
    this.mkdir('/etc');
    this.mkdir('/var');
    this.mkdir('/tmp');
    
    this.touch('/home/user/.bashrc', '# bashrc\n');
    this.touch('/home/user/.secret', 'secret key\n');
    this.mkdir('/home/user/Desktop');
    this.mkdir('/home/user/Documents');
    this.mkdir('/home/user/Downloads');
    this.touch('/home/user/file.txt', 'This is a test file.');
  }

  resolvePath(currentPath: string, targetPath: string): string {
    if (targetPath === '') return currentPath;
    
    let parts: string[];
    let target = targetPath;
    
    if (target.startsWith('/')) {
        parts = [];
    } else if (target === '~') {
        return '/home/user';
    } else if (target.startsWith('~')) {
        parts = ['home', 'user'];
        target = target.slice(2); // remove ~/ or ~
    } else {
        parts = currentPath.split('/').filter(Boolean);
    }
    
    const targetParts = target.split('/').filter(Boolean);
    
    for (const part of targetParts) {
      if (part === '.') continue;
      if (part === '..') {
        if (parts.length > 0) parts.pop();
      } else {
        parts.push(part);
      }
    }
    
    return '/' + parts.join('/');
  }

  getNode(path: string): FileNode | null {
    if (path === '/') return this.root;
    const parts = path.split('/').filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children || !current.children[part]) return null;
      current = current.children[part];
    }
    return current;
  }

  mkdir(path: string): boolean {
    const parts = path.split('/').filter(Boolean);
    const dirName = parts.pop()!;
    const parentPath = '/' + parts.join('/');
    const parent = this.getNode(parentPath);
    
    if (!parent || parent.type !== 'dir' || !parent.children) return false;
    if (parent.children[dirName]) return false;
    
    parent.children[dirName] = {
      name: dirName,
      type: 'dir',
      children: {},
      permissions: 'drwxr-xr-x',
      owner: 'user',
      group: 'user',
      size: 4096,
      updatedAt: new Date(),
    };
    return true;
  }

  touch(path: string, content: string = ''): boolean {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const parentPath = '/' + parts.join('/');
    const parent = this.getNode(parentPath);
    
    if (!parent || parent.type !== 'dir' || !parent.children) return false;
    
    if (parent.children[fileName]) {
      parent.children[fileName].updatedAt = new Date();
      // If content is provided and we want to allow touch to set it (simplified for this mock)
      if (content) {
         parent.children[fileName].content = content;
         parent.children[fileName].size = content.length;
      }
      return true;
    }
    
    parent.children[fileName] = {
      name: fileName,
      type: 'file',
      content,
      permissions: '-rw-r--r--',
      owner: 'user',
      group: 'user',
      size: content.length,
      updatedAt: new Date(),
    };
    return true;
  }

  writeFile(path: string, content: string): boolean {
    return this.touch(path, content);
  }

  appendFile(path: string, content: string): boolean {
    const existing = this.readFile(path) || '';
    return this.touch(path, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + content);
  }

  readFile(path: string): string | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }

  rm(path: string, recursive: boolean = false): boolean {
    if (path === '/') return false;
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const parentPath = '/' + parts.join('/');
    const parent = this.getNode(parentPath);
    
    if (!parent || !parent.children || !parent.children[fileName]) return false;
    
    const target = parent.children[fileName];
    if (target.type === 'dir') {
       if (!recursive) {
           if (Object.keys(target.children || {}).length > 0) return false;
       }
    }
    
    delete parent.children[fileName];
    return true;
  }

  cp(src: string, dest: string): boolean {
    const srcNode = this.getNode(src);
    if (!srcNode || srcNode.type !== 'file') return false; // simple file copy
    
    return this.touch(dest, srcNode.content || '');
  }

  mv(src: string, dest: string): boolean {
    if (this.cp(src, dest)) {
       return this.rm(src);
    }
    return false;
  }
}
