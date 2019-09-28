import * as vscode from 'vscode';
import { actionTree } from './actionTree';
import { userAnimalTree } from './userAnimalTree';
import { AxiosPromise } from 'axios';
export async function discover(
  context: vscode.ExtensionContext,
  aT: actionTree,
  api
) {
  let characterId = context.workspaceState.get('characterId');
  let regionId = context.workspaceState.get('regionId');
  let data = await api({
    url: 'action/inWar',
    method: 'GET',
    data: { regionId, characterId }
  });

  context.workspaceState.update('ActionData', JSON.stringify(data.data));
  // context.workspaceState.update('fightActionId', JSON.stringify(data.data));

  // console.log('inWar', data);

  aT.createTreeView(context);
}
export async function getMyAnimal(
  context: vscode.ExtensionContext,
  uAT: userAnimalTree,
  api
) {
  let characterId = context.workspaceState.get('characterId');
  let regionId = context.workspaceState.get('regionId');
  let data = await api({
    url: 'character/animal',
    method: 'GET',
    data: { regionId, characterId }
  });

  context.workspaceState.update('UserAnimal', JSON.stringify(data.data));
  // context.workspaceState.update('fightActionId', JSON.stringify(data.data));

  // console.log('inWar', data);

  uAT.createTreeView(context);
}
