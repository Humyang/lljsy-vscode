'use strict';

import * as vscode from 'vscode';

const path = require('path');
var fs = require('fs');

import server from './server';
import { actionTree } from './actionTree';
export async function activate(context: vscode.ExtensionContext) {
  let aT = new actionTree(context);
  let api = server(context);
  var notLogin = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  notLogin.text = '未登录';
  notLogin.command = 'user.login';
  notLogin.show();

  var loginOut = vscode.window.createStatusBarItem();
  loginOut.text = '退出';
  loginOut.command = 'user.login';

  var regiset = vscode.window.createStatusBarItem();
  regiset.text = '创建账号';
  regiset.command = 'user.regiest';
  regiset.show();

  var characterPick = vscode.window.createStatusBarItem();
  characterPick.text = '选择角色';
  characterPick.command = 'character.pick';

  var regionPick = vscode.window.createStatusBarItem();
  regionPick.text = '当前区域';
  regionPick.command = 'regionPick.pick';
  regionPick.show();

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

      let res = await api({
        url: 'auth/token',
        method: 'POST',
        data: {
          username,
          password
        }
      });
      context.workspaceState.update('token', res.data.accessToken);
      let data = await api({
        url: 'auth/data',
        method: 'POST',
        data: {}
      });
      // console.log(data);
      loginOut.show();
      regiset.hide();
      notLogin.hide();
      characterPick.show();
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
      let data = await api({
        url: 'users/regiest',
        method: 'POST',
        data: { username, password }
      });
      vscode.window.showInformationMessage('创建成功');
    }),
    vscode.commands.registerCommand('character.pick', async () => {
      let data = await api({
        url: 'character/list',
        method: 'GET',
        data: {}
      });
      let characterList = data.data.map(item => {
        return item.name;
      });
      const character = await vscode.window.showQuickPick([
        ...characterList,
        '创建角色'
      ]);
      if (character == '创建角色') {
        let characterName = await vscode.window.showInputBox({
          prompt: '角色名称'
        });
        let data = await api({
          url: 'character/add',
          method: 'POST',
          data: { name: characterName }
        });
      } else {
        let f = data.data.find(i => {
          return i.name == character;
        });

        characterPick.text = '当前角色：' + character + `(${f.id})`;

        context.workspaceState.update('characterId', f.id);

        context.workspaceState.update('characterName', f.name);
      }
    }),
    vscode.commands.registerCommand('regionPick.pick', async () => {
      let data = await api({
        url: 'region/list',
        method: 'GET',
        data: {}
      });
      let regionList = data.data.map(item => {
        return item.regionName;
      });
      const region = await vscode.window.showQuickPick([...regionList]);
      let f = data.data.find(i => {
        return i.regionName == region;
      });
      regionPick.text = '当前区域：' + region + `(${f.id})`;

      context.workspaceState.update('regionId', f.id);

      context.workspaceState.update('regionName', f.regionName);
    }),
    vscode.commands.registerCommand('region.discover', async () => {
      console.log('222');
      let characterId = context.workspaceState.get('characterId');
      let regionId = context.workspaceState.get('regionId');
      let data = await api({
        url: 'action/inWar',
        method: 'GET',
        data: { regionId, characterId }
      });

      context.workspaceState.update('ActionData', JSON.stringify(data.data));
      // console.log('inWar', data);

      aT.createTreeView(context);
    })
  );
}
