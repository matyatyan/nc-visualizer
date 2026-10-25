import * as vscode from 'vscode';
import { ViewerPanel } from '../panels/ViewerPanel';

export function registerOpenViewerCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('nc-visualizer.openViewer', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('アクティブなエディタがありません。');
            return;
        }

        // 範囲選択されたNCコードの取得
        const selection = editor.selection;
        const gcodeText = editor.document.getText(selection);

        if (!gcodeText || gcodeText.trim() === '') {
            vscode.window.showWarningMessage('軌跡を描画したいNCコードを範囲選択してください。');
            return;
        }

        // Webviewパネルの表示・更新クラスを呼び出す
        ViewerPanel.createOrShow(context.extensionUri, gcodeText, editor, selection.start.line);
    });

    context.subscriptions.push(disposable);
}