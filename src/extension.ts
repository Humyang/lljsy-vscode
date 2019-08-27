'use strict';

import * as vscode from 'vscode';

const path = require('path');
var fs = require('fs');
import axios from 'axios';
import { AxiosRequestConfig } from 'axios';

export async function activate(context: vscode.ExtensionContext) {
  var notLogin = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  notLogin.text = '未登录';
  notLogin.command = 'user.login';
  notLogin.show();

  var loginOut = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  loginOut.text = '退出';
  loginOut.command = 'user.login';

  var regiset = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  regiset.text = '创建账号';
  regiset.command = 'user.regiest';
  regiset.show();

  var characterPick = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  characterPick.text = '选择角色';
  characterPick.command = 'character.pick';

  context.subscriptions.push(
    vscode.commands.registerCommand('user.login', async () => {
      const username = await vscode.window.showInputBox({
        prompt: '输入账号',
        ignoreFocusOut: true
      });
      const password = await vscode.window.showInputBox({
        prompt: '输入密码',
        ignoreFocusOut: true
      });
      let res = await axios({
        url: 'http://localhost:3000/auth/token',
        method: 'POST',
        data: {
          username,
          password
        }
      });
      // console.log('res', res);
      let data = await axios({
        url: 'http://localhost:3000/auth/data',
        method: 'POST',
        headers: {
          Authorization: 'bearer ' + res.data.accessToken
        }
      });
      // console.log('data', data);
      // if (tokenValue) {
      //   let res = await axios({
      //     url: 'http://localhost:3000/auth/token',
      //     method: 'GET'
      //   });

      //   loginOut.show();
      //   regiset.hide();
      //   notLogin.hide();
      //   characterPick.show();
      // }
    }),
    vscode.commands.registerCommand('user.regiest', async () => {
      const username = await vscode.window.showInputBox({
        prompt: '输入账号',
        ignoreFocusOut: true
      });
      const password = await vscode.window.showInputBox({
        prompt: '输入密码',
        ignoreFocusOut: true
      });
      let res = await axios({
        url: 'http://localhost:3000/users/regiest',
        method: 'POST',
        data: {
          username,
          password
        }
      });
      console.log('regiest', res);
    }),
    vscode.commands.registerCommand('character.pick', async () => {})
    //
  );
}
