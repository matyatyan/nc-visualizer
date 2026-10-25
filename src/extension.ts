import * as vscode from 'vscode';
import { registerOpenViewerCommand } from './commands/openViewerCommand';

export function activate(context: vscode.ExtensionContext) {
    // 「ビュワー起動」コマンドの登録処理を呼び出し
    registerOpenViewerCommand(context);
}

export function deactivate() {}