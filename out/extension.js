"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const openViewerCommand_1 = require("./commands/openViewerCommand");
function activate(context) {
    // 「ビュワー起動」コマンドの登録処理を呼び出し
    (0, openViewerCommand_1.registerOpenViewerCommand)(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map