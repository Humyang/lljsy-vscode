'use strict';

import * as vscode from 'vscode';

const path = require('path');
var fs = require('fs');

export async function activate(context: vscode.ExtensionContext) {
  console.log('activate');
  context.subscriptions.push(
    vscode.commands.registerCommand('user.login', async () => {
      const inputPath = await vscode.window.showInputBox({
        value: '',
        prompt: '输入token',
        ignoreFocusOut: true
      });
    })
    //
  );
}
