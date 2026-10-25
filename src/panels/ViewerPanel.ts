import * as vscode from 'vscode';
import { parseGCode } from '../utils/gcodeParser';
import { getHtmlForWebview } from './viewerHtml';

/**
 * NCコードの3Dビュワーを表示するWebviewパネルを管理するクラス
 */
export class ViewerPanel {
    public static currentPanel: ViewerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _sourceEditor: vscode.TextEditor;
    private _sourceLineOffset: number;
    private readonly _sourceLineDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
        isWholeLine: true
    });

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        gcodeText: string,
        sourceEditor: vscode.TextEditor,
        sourceLineOffset: number
    ) {
        this._panel = panel;
        this._sourceEditor = sourceEditor;
        this._sourceLineOffset = sourceLineOffset;
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            (message: { type?: string; startLine?: number; endLine?: number }) => {
                if (message.type !== 'displayedLines'
                    || typeof message.startLine !== 'number'
                    || typeof message.endLine !== 'number'
                    || !Number.isInteger(message.startLine)
                    || !Number.isInteger(message.endLine)) {
                    return;
                }

                this._revealSourceLines(message.startLine, message.endLine);
            },
            null,
            this._disposables
        );

        // HTML生成を別モジュールから取得してセット
        const parsedData = parseGCode(gcodeText);
        this._panel.webview.html = getHtmlForWebview(parsedData);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        gcodeText: string,
        sourceEditor: vscode.TextEditor,
        sourceLineOffset: number
    ) {
        const column = vscode.ViewColumn.Two;

        if (ViewerPanel.currentPanel) {
            const currentPanel = ViewerPanel.currentPanel;
            currentPanel._panel.reveal(column);
            currentPanel._sourceEditor = sourceEditor;
            currentPanel._sourceLineOffset = sourceLineOffset;
            const parsedData = parseGCode(gcodeText);
            currentPanel._panel.webview.html = getHtmlForWebview(parsedData);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'nc3DViewer',
            'NCコード 3Dビュワー',
            column,
            { enableScripts: true }
        );

        ViewerPanel.currentPanel = new ViewerPanel(panel, extensionUri, gcodeText, sourceEditor, sourceLineOffset);
    }

    private _revealSourceLines(startLine: number, endLine: number) {
        const document = this._sourceEditor.document;
        const firstLine = Math.max(0, Math.min(startLine + this._sourceLineOffset, document.lineCount - 1));
        const lastLine = Math.max(firstLine, Math.min(endLine + this._sourceLineOffset, document.lineCount - 1));
        const range = new vscode.Range(
            firstLine,
            0,
            lastLine,
            document.lineAt(lastLine).text.length
        );

        this._sourceEditor.setDecorations(this._sourceLineDecoration, [range]);
        this._sourceEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    public dispose() {
        ViewerPanel.currentPanel = undefined;
        this._sourceEditor.setDecorations(this._sourceLineDecoration, []);
        this._sourceLineDecoration.dispose();
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}