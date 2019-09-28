'use strict';

import * as vscode from 'vscode';

const path = require('path');
var fs = require('fs');

import server from './server';
import { actionTree } from './actionTree';

import { userAnimalTree } from './userAnimalTree';
import { discover, getMyAnimal } from './method';
export async function activate(context: vscode.ExtensionContext) {
  let aT = new actionTree(context);
  let uAT = new userAnimalTree(context);
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

  // 读取本地数据
  let token = context.workspaceState.get('token');
  if (token) {
    let characterName: string = context.workspaceState.get('characterName');
    let cId = context.workspaceState.get('characterId');

    characterPick.text = '当前角色：' + characterName + `(${cId})`;

    let regionId = context.workspaceState.get('regionId');

    let regionName = context.workspaceState.get('regionName');
    regionPick.text = '当前区域：' + regionName + `(${regionId})`;
    loginOut.show();
    regiset.hide();
    notLogin.hide();
    characterPick.show();
  }

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
      // console.log('222');
      discover(context, aT, api);
      getMyAnimal(context, uAT, api);
    }),

    vscode.commands.registerCommand('region.runAway', async () => {
      // console.log('222');
      let characterId = context.workspaceState.get('characterId');
      let regionId = context.workspaceState.get('regionId');

      // let ActionData = JSON.parse(context.workspaceState.get('ActionData'));
      let ActionData: any = context.workspaceState.get('ActionData');
      if (ActionData) {
        let ac = JSON.parse(ActionData);
        let data = await api({
          url: 'action/runAway',
          method: 'GET',
          data: { regionId, characterId, fightActionId: ac.id }
        });

        context.workspaceState.update('ActionData', undefined);
        // console.log('inWar', data);

        aT.createTreeView(context);
      }
    }),
    vscode.commands.registerCommand('region.catch', async (i, b) => {
      // console.log('region.catch', i, b);
      let characterId = context.workspaceState.get('characterId');
      let regionId = context.workspaceState.get('regionId');
      let ActionData: any = context.workspaceState.get('ActionData');
      let ac = JSON.parse(ActionData);
      let data = await api({
        url: 'action/catch',
        method: 'POST',
        data: { characterId, fightActionId: ac.id, catchTargetId: i.id }
      });
      console.log('catch result', data.data);
      if (data.data === true) {
        vscode.window.showInformationMessage('捕捉成功');
        discover(context, aT, api);
      } else {
        vscode.window.showInformationMessage('捕捉失败');
      }
    })
  );
}
