"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewerPanel = void 0;
const vscode = __importStar(require("vscode"));
const gcodeParser_1 = require("../utils/gcodeParser");
const viewerHtml_1 = require("./viewerHtml");
/**
 * NCコードの3Dビュワーを表示するWebviewパネルを管理するクラス
 */
class ViewerPanel {
    static currentPanel;
    _panel;
    _disposables = [];
    _sourceEditor;
    _sourceLineOffset;
    _sourceLineDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
        isWholeLine: true
    });
    constructor(panel, extensionUri, gcodeText, sourceEditor, sourceLineOffset) {
        this._panel = panel;
        this._sourceEditor = sourceEditor;
        this._sourceLineOffset = sourceLineOffset;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage((message) => {
            if (message.type !== 'displayedLines'
                || typeof message.startLine !== 'number'
                || typeof message.endLine !== 'number'
                || !Number.isInteger(message.startLine)
                || !Number.isInteger(message.endLine)) {
                return;
            }
            this._revealSourceLines(message.startLine, message.endLine);
        }, null, this._disposables);
        // HTML生成を別モジュールから取得してセット
        const parsedData = (0, gcodeParser_1.parseGCode)(gcodeText);
        this._panel.webview.html = (0, viewerHtml_1.getHtmlForWebview)(parsedData);
    }
    static createOrShow(extensionUri, gcodeText, sourceEditor, sourceLineOffset) {
        const column = vscode.ViewColumn.Two;
        if (ViewerPanel.currentPanel) {
            const currentPanel = ViewerPanel.currentPanel;
            currentPanel._panel.reveal(column);
            currentPanel._sourceEditor = sourceEditor;
            currentPanel._sourceLineOffset = sourceLineOffset;
            const parsedData = (0, gcodeParser_1.parseGCode)(gcodeText);
            currentPanel._panel.webview.html = (0, viewerHtml_1.getHtmlForWebview)(parsedData);
            return;
        }
        const panel = vscode.window.createWebviewPanel('nc3DViewer', 'NCコード 3Dビュワー', column, { enableScripts: true });
        ViewerPanel.currentPanel = new ViewerPanel(panel, extensionUri, gcodeText, sourceEditor, sourceLineOffset);
    }
    _revealSourceLines(startLine, endLine) {
        const document = this._sourceEditor.document;
        const firstLine = Math.max(0, Math.min(startLine + this._sourceLineOffset, document.lineCount - 1));
        const lastLine = Math.max(firstLine, Math.min(endLine + this._sourceLineOffset, document.lineCount - 1));
        const range = new vscode.Range(firstLine, 0, lastLine, document.lineAt(lastLine).text.length);
        this._sourceEditor.setDecorations(this._sourceLineDecoration, [range]);
        this._sourceEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
    dispose() {
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
exports.ViewerPanel = ViewerPanel;
//# sourceMappingURL=ViewerPanel.js.map