import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';

//#region Utilities
// const fs_extra = require('../utils/fs-extra');
// const fs_e = require('fs-extra');
namespace _ {
  function handleResult<T>(
    resolve: (result: T) => void,
    reject: (error: Error) => void,
    error: Error | null | undefined,
    result: T
  ): void {
    if (error) {
      reject(massageError(error));
    } else {
      resolve(result);
    }
  }

  function massageError(error: Error & { code?: string }): Error {
    if (error.code === 'ENOENT') {
      return vscode.FileSystemError.FileNotFound();
    }

    if (error.code === 'EISDIR') {
      return vscode.FileSystemError.FileIsADirectory();
    }

    if (error.code === 'EEXIST') {
      return vscode.FileSystemError.FileExists();
    }

    if (error.code === 'EPERM' || error.code === 'EACCESS') {
      return vscode.FileSystemError.NoPermissions();
    }

    return error;
  }

  export function checkCancellation(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }
  }

  export function normalizeNFC(items: string): string;
  export function normalizeNFC(items: string[]): string[];
  export function normalizeNFC(items: string | string[]): string | string[] {
    if (process.platform !== 'darwin') {
      return items;
    }

    if (Array.isArray(items)) {
      return items.map(item => item.normalize('NFC'));
    }

    return items.normalize('NFC');
  }

  export function readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (error, children) =>
        handleResult(resolve, reject, error, normalizeNFC(children))
      );
    });
  }

  export function stat(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
      fs.stat(path, (error, stat) =>
        handleResult(resolve, reject, error, stat)
      );
    });
  }

  export function readfile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(path, (error, buffer) =>
        handleResult(resolve, reject, error, buffer)
      );
    });
  }

  export function writefile(path: string, content: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, content, error =>
        handleResult(resolve, reject, error, void 0)
      );
    });
  }

  export function exists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.exists(path, exists => handleResult(resolve, reject, null, exists));
    });
  }

  export function rmrf(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      rimraf(path, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function mkdir(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      mkdirp(path, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function rename(oldPath: string, newPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rename(oldPath, newPath, error =>
        handleResult(resolve, reject, error, void 0)
      );
    });
  }

  export function unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
    });
  }
}

export class FileStat implements vscode.FileStat {
  constructor(private fsStat: fs.Stats) {}

  get type(): vscode.FileType {
    return this.fsStat.isFile()
      ? vscode.FileType.File
      : this.fsStat.isDirectory()
      ? vscode.FileType.Directory
      : this.fsStat.isSymbolicLink()
      ? vscode.FileType.SymbolicLink
      : vscode.FileType.Unknown;
  }

  get isFile(): boolean | undefined {
    return this.fsStat.isFile();
  }

  get isDirectory(): boolean | undefined {
    return this.fsStat.isDirectory();
  }

  get isSymbolicLink(): boolean | undefined {
    return this.fsStat.isSymbolicLink();
  }

  get size(): number {
    return this.fsStat.size;
  }

  get ctime(): number {
    return this.fsStat.ctime.getTime();
  }

  get mtime(): number {
    return this.fsStat.mtime.getTime();
  }
}

interface Entry {
  uri: vscode.Uri;
  type: vscode.FileType;
  id: number;
  status: number;
}

//#endregion

export class FileSystemProvider
  implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider {
  private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;
  private _extensionPath: String;
  private _context: vscode.ExtensionContext;
  constructor(extensionPath: String, context: vscode.ExtensionContext) {
    this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    this._extensionPath = extensionPath;
    this._context = context;
  }

  get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
    return this._onDidChangeFile.event;
  }

  watch(
    uri: vscode.Uri,
    options: { recursive: boolean; excludes: string[] }
  ): vscode.Disposable {
    const watcher = fs.watch(
      uri.fsPath,
      { recursive: options.recursive },
      async (event: string, filename: string | Buffer) => {
        const filepath = path.join(
          uri.fsPath,
          _.normalizeNFC(filename.toString())
        );

        // TODO support excludes (using minimatch library?)

        this._onDidChangeFile.fire([
          {
            type:
              event === 'change'
                ? vscode.FileChangeType.Changed
                : (await _.exists(filepath))
                ? vscode.FileChangeType.Created
                : vscode.FileChangeType.Deleted,
            uri: uri.with({ path: filepath })
          } as vscode.FileChangeEvent
        ]);
      }
    );

    return { dispose: () => watcher.close() };
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return this._stat(uri.fsPath);
  }

  async _stat(path: string): Promise<vscode.FileStat> {
    return new FileStat(await _.stat(path));
  }

  readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri);
  }

  async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const children = await _.readdir(uri.fsPath);

    const result: [string, vscode.FileType][] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const stat = await this._stat(path.join(uri.fsPath, child));
      result.push([child, stat.type]);
    }

    return Promise.resolve(result);
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    return _.mkdir(uri.fsPath);
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    return _.readfile(uri.fsPath);
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): void | Thenable<void> {
    return this._writeFile(uri, content, options);
  }

  async _writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const exists = await _.exists(uri.fsPath);
    if (!exists) {
      if (!options.create) {
        throw vscode.FileSystemError.FileNotFound();
      }

      await _.mkdir(path.dirname(uri.fsPath));
    } else {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      }
    }

    return _.writefile(uri.fsPath, content as Buffer);
  }

  delete(
    uri: vscode.Uri,
    options: { recursive: boolean }
  ): void | Thenable<void> {
    if (options.recursive) {
      return _.rmrf(uri.fsPath);
    }

    return _.unlink(uri.fsPath);
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {
    return this._rename(oldUri, newUri, options);
  }

  async _rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    const exists = await _.exists(newUri.fsPath);
    if (exists) {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      } else {
        await _.rmrf(newUri.fsPath);
      }
    }

    const parentExists = await _.exists(path.dirname(newUri.fsPath));
    if (!parentExists) {
      await _.mkdir(path.dirname(newUri.fsPath));
    }

    return _.rename(oldUri.fsPath, newUri.fsPath);
  }

  // tree data provider

  async getChildren(element?: Entry): Promise<Entry[]> {
    let UserAnimal: any = this._context.workspaceState.get('UserAnimal');
    console.log('UserAnimal', UserAnimal);
    if (UserAnimal) {
      let data = JSON.parse(UserAnimal);
      let e: Entry[] = data.map(item => {
        var entry: Entry = {
          uri: vscode.Uri.file(`./${item.health + item.name}.js`),
          type: vscode.FileType.Unknown,
          status: 1,
          id: item.id
        };
        return entry;
      });
      // var e: Entry = {
      //   uri: vscode.Uri.file('./111.js'),
      //   type: vscode.FileType.Unknown
      // };
      // e.uri = vscode.Uri.file('123123');
      // e.type = vscode.FileType.Unknown;

      return e;
    }
    // [{ name: 123, type: 'file' }].map(([name, type]) => ({
    //   uri: vscode.Uri.file(name),
    //   type
    // }));
    // if (element) {
    //   const children = await this.readDirectory(element.uri);
    //   return children.map(([name, type]) => ({
    //     uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
    //     type
    //   }));
    // }

    // const workspaceFolder = vscode.workspace.workspaceFolders.filter(
    //   folder => folder.uri.scheme === 'file'
    // )[0];

    // if (workspaceFolder) {
    //   let isExsits = await fs_extra.exists(
    //     workspaceFolder.uri.fsPath + '/.template'
    //   );
    //   if (!isExsits) {
    //     // 如果不存在，则将拓展目录下的 .template 目录移动到当前目录
    //     let extensionTempalteExsits = await fs_extra.exists(
    //       this._extensionPath + '/template'
    //     );
    //     if (extensionTempalteExsits) {
    //       await fs_e.copy(
    //         this._extensionPath + '/template',
    //         workspaceFolder.uri.fsPath + '/.template'
    //       ); //copies directory, even if it has subdirectories or files
    //     }
    //   }
    //   let stats = fs.lstatSync(workspaceFolder.uri.fsPath + '/.template');

    //   if (!stats.isDirectory()) {
    //     await vscode.window.showErrorMessage('template is not exisited!!');
    //     return;
    //   } else {
    //     // 读取项目的 .template 文件夹
    //     // 如果有这个目录则读取
    //     // 如果没有则初始化默认值
    //     let templateUri = vscode.Uri.parse(
    //       workspaceFolder.uri.fsPath + '/.template'
    //     );

    //     const children = await this.readDirectory(templateUri);
    //     children.sort((a, b) => {
    //       if (a[1] === b[1]) {
    //         return a[0].localeCompare(b[0]);
    //       }
    //       return a[1] === vscode.FileType.Directory ? -1 : 1;
    //     });
    //     return children.map(([name, type]) => ({
    //       uri: vscode.Uri.file(
    //         path.join(workspaceFolder.uri.fsPath + '/.template', name)
    //       ),
    //       type
    //     }));
    //   }
    // }

    return [];
  }

  getTreeItem(element: Entry): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.uri,
      element.type === vscode.FileType.Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    // if (element.type === vscode.FileType.File) {
    //   treeItem.command = {
    //     command: 'region.openFile',
    //     title: 'Open File',
    //     arguments: [element.uri]
    //   };
    // }
    treeItem.contextValue = 'monster';
    return treeItem;
  }
}

export class userAnimalTree {
  constructor(context: vscode.ExtensionContext) {
    this.createTreeView(context);
    // this.extensionPath = context.extensionPath
    vscode.commands.registerCommand('userAnimal.openFile', resource =>
      this.openResource(resource)
    );
  }
  public createTreeView(context: vscode.ExtensionContext) {
    const treeDataProvider = new FileSystemProvider(
      context.extensionPath,
      context
    );

    vscode.window.createTreeView('userAnimal', {
      treeDataProvider
    });
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}
