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
exports.registerOpenViewerCommand = registerOpenViewerCommand;
const vscode = __importStar(require("vscode"));
const ViewerPanel_1 = require("../panels/ViewerPanel");
function registerOpenViewerCommand(context) {
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
        ViewerPanel_1.ViewerPanel.createOrShow(context.extensionUri, gcodeText, editor, selection.start.line);
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=openViewerCommand.js.map