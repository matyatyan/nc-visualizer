# NC Visualizer

Visual Studio Code内でNCコード（Gコード）の軌跡を3D表示するための拡張機能です。
A 3D visualization extension for NC / G-code files directly inside Visual Studio Code.

## Features (主な機能)

- **3D Toolpath Preview (3Dツールパスプレビュー)**: 
  Three.jsを使用して、Gコード（G0/G1/G2/G3）の座標から3D空間上に加工軌跡を描画します。
- **Context Menu Integration (右クリック)**: 
  エディタで任意のNCコードを範囲選択し、右クリックメニューから起動できます。
- **Side-by-Side View (並べて表示)**: 
  エディタ画面のすぐ隣（右側パネル）に3Dビュワーが立ち上がるため、コードと軌跡を同時に確認しながら作業できます。

## Usage (使い方)

1. エディタで軌跡を描画したいNCコードを**範囲選択**します。
2. 右クリックしてコンテキストメニューを開き、**「ビュワー起動」** を選択します。
3. 右側のパネルに3Dビュワーが開き、ツールパスの軌跡が表示されます。

## Requirements (動作環境)

- Visual Studio Code (^1.107.0以降)
- 特に外部ツールのインストールは不要です。

## Known Issues (既定の制限・既知の問題)

- 円弧補間はXY平面のみ対応しています。

## Release Notes (リリースノート)

### 1.0.0

- Initial release of NC Visualizer.
- Added 3D toolpath visualization feature via Webview and Three.js.
- Added editor context menu integration for selected text.