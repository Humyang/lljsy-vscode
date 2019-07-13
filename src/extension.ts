"use strict";

import * as vscode from "vscode";


const path = require("path");
var fs = require("fs");

export async function activate(context: vscode.ExtensionContext) {


  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lljsy.helloWorld",
      async () => {
        
      }
    )
  );
}
