"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlForWebview = getHtmlForWebview;
/**
 * Webview（HTML/CSS/Three.jsスクリプト）を生成する関数
 */
function getHtmlForWebview(parsedData) {
    return `<!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>NC 3D Viewer</title>
        <style>
            body { margin: 0; overflow: hidden; background-color: var(--vscode-editor-background, #1e1e1e); }
            #info { position: absolute; top: 10px; left: 10px; color: var(--vscode-editor-foreground, #fff); font-family: sans-serif; font-size: 12px; pointer-events: none; z-index: 10; }
            
            /* コンパクト化されたD補正値入力パネルのスタイル */
            #d-offset-panel {
                position: absolute;
                top: 95px;
                left: 10px;
                background: rgba(40, 40, 40, 0.85);
                padding: 5px 6px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                font-family: sans-serif;
                font-size: 11px;
                color: var(--vscode-editor-foreground, #fff);
                z-index: 20;
                display: none;
                max-width: 180px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            }
            .d-row {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-top: 3px;
            }
            .d-row:first-child {
                margin-top: 0;
            }
            .d-label {
                width: 35px;
                font-weight: bold;
            }
            .d-input {
                width: 50px;
                background: #222;
                color: #fff;
                border: 1px solid #555;
                padding: 2px 3px;
                border-radius: 2px;
                font-size: 11px;
            }
            /* 数値入力欄の上下矢印（スピンボタン）を非表示にする設定 */
            .d-input::-webkit-inner-spin-button,
            .d-input::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .d-input {
                -moz-appearance: textfield; /* Firefox用 */
            }

            .d-btn {
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 2px 5px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                transition: background 0.2s;
            }
            .d-btn:hover {
                background: #505050;
            }

            #axes { position: absolute; top: 10px; right: 10px; width: 100px; height: 100px; z-index: 10; pointer-events: none; }
            
            #playback-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 6px;
                background: rgba(40, 40, 40, 0.85);
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                z-index: 20;
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            }
            #playback-controls button {
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: background 0.2s;
            }
            #playback-controls button:hover {
                background: #505050;
            }
            #playback-controls button:active {
                background: #222;
            }

            #tooltip {
                position: absolute;
                display: none;
                background: var(--vscode-editorWidget-background, var(--vscode-editor-background, #1e1e1e));
                color: var(--vscode-textLink-foreground, var(--vscode-focusBorder, #00ffcc));
                padding: 8px 12px;
                border-radius: 4px;
                font-family: sans-serif;
                font-size: 12px;
                pointer-events: none;
                border: 1px solid var(--vscode-focusBorder, var(--vscode-textLink-foreground, #00ffcc));
                z-index: 100;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    </head>
    <body>
        <div id="info">NC 3D Viewer (主平面: XY)<br>・回転: 左ドラッグ<br>・拡大縮小: ホイール<br>・移動: 右ドラッグ</div>
        
        <div id="d-offset-panel">
            <div style="font-weight: bold; margin-bottom: 3px; border-bottom: 1px solid #555; padding-bottom: 2px; font-size: 10px;">D補正値設定</div>
            <div id="d-rows-container"></div>
        </div>

        <div id="axes"></div>
        <div id="tooltip"></div>
        
        <div id="playback-controls">
            <button id="btn-first" title="最初の点のみを表示">|&lt;</button>
            <button id="btn-prev" title="1行戻る">&lt;</button>
            <button id="btn-next" title="1行進む">&gt;</button>
            <button id="btn-last" title="1行目から最終行まで描画">&gt;|</button>
        </div>

        <script>
            try {
                const vscode = acquireVsCodeApi();
                const parsedData = ${JSON.stringify(parsedData)};
                const steps = parsedData.steps || [];
                const dValues = parsedData.dValues || [];

                const dOffsets = {};
                const dPanel = document.getElementById('d-offset-panel');
                const dRowsContainer = document.getElementById('d-rows-container');

                if (dValues.length > 0) {
                    dPanel.style.display = 'block';

                    dValues.forEach((dName) => {
                        const row = document.createElement('div');
                        row.className = 'd-row';

                        const label = document.createElement('span');
                        label.className = 'd-label';
                        label.textContent = dName; 

                        const input = document.createElement('input');
                        input.type = 'number';
                        input.step = '0.001';
                        input.className = 'd-input';
                        input.value = '0.000';

                        const btn = document.createElement('button');
                        btn.className = 'd-btn';
                        btn.textContent = '反映';
                        btn.onclick = () => {
                            const offsetValue = parseFloat(input.value) || 0;
                            dOffsets[dName] = offsetValue;

                            if (dName.includes('45')) {
                                dOffsets['D#900'] = offsetValue;
                            }

                            redrawSteps();
                        };

                        row.appendChild(label);
                        row.appendChild(input);
                        row.appendChild(btn);
                        dRowsContainer.appendChild(row);
                    });
                }
                
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 10000);
                const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.autoClear = false;
                document.body.appendChild(renderer.domElement);

                let gridHelper;
                const axesHelperMain = new THREE.AxesHelper(100);
                scene.add(axesHelperMain);
                const lineMaterial = new THREE.LineBasicMaterial();
                const pointsMaterial = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false });
                
                function updateThemeColors() {
                    const styles = getComputedStyle(document.body);
                    const background = new THREE.Color(styles.getPropertyValue('--vscode-editor-background').trim() || '#1e1e1e');
                    const foreground = new THREE.Color(styles.getPropertyValue('--vscode-editor-foreground').trim() || '#ffffff');
                    const accent = new THREE.Color(styles.getPropertyValue('--vscode-textLink-foreground').trim()
                        || styles.getPropertyValue('--vscode-focusBorder').trim()
                        || '#3700ff');
                    const subtleGrid = foreground.clone().lerp(background, 0.8);

                    renderer.setClearColor(background, 1);
                    lineMaterial.color.setHex(0x04fd19);
                    pointsMaterial.color.copy(foreground);
                    const axesColors = axesHelperMain.geometry.getAttribute('color');
                    if (axesColors) {
                        for (let i = 0; i < axesColors.count; i++) {
                            axesColors.setXYZ(i, accent.r, accent.g, accent.b);
                        }
                        axesColors.needsUpdate = true;
                    }

                    if (gridHelper) {
                        scene.remove(gridHelper);
                        gridHelper.geometry.dispose();
                        gridHelper.material.dispose();
                    }
                    gridHelper = new THREE.GridHelper(500, 50, accent.getHex(), subtleGrid.getHex());
                    scene.add(gridHelper);
                }

                const controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.maxDistance = 1e7;
                controls.enableZoom = false;

                updateThemeColors();

                let currentStepIndex = steps.length - 1;
                let currentLineMesh = null;
                let currentPointsMesh = null;
                let activeNcCoords = [];

                function getAdjustedPoint(pt, step) {
                    if (!step || !step.compensationMode || !step.dCode) {
                        return pt;
                    }

                    let radius = dOffsets[step.dCode] || 0;
                    if (radius === 0) return pt;

                    if (step.compensationMode === 'G42') {
                        radius = -radius;
                    }

                    return {
                        x: pt.x + radius,
                        y: pt.y,
                        z: pt.z
                    };
                }

                function redrawSteps() {
                    if (currentLineMesh) scene.remove(currentLineMesh);
                    if (currentPointsMesh) scene.remove(currentPointsMesh);

                    const combinedLineVecs = [];
                    const combinedMarkerVecs = [];
                    activeNcCoords = [];

                    const maxIdx = Math.min(currentStepIndex, steps.length - 1);

                    if (maxIdx >= 0) {
                        vscode.postMessage({
                            type: 'displayedLines',
                            startLine: steps[0].sourceLine,
                            endLine: steps[maxIdx].sourceLine
                        });
                    }

                    for (let i = 0; i <= maxIdx && i < steps.length; i++) {
                        const step = steps[i];
                        
                        if (currentStepIndex === 0 && i === 0) {
                            if (step.linePoints && step.linePoints.length > 0) {
                                const rawPt = step.linePoints[0];
                                const pt = getAdjustedPoint(rawPt, step);
                                combinedLineVecs.push(new THREE.Vector3(pt.x, pt.y, pt.z));
                                combinedMarkerVecs.push(new THREE.Vector3(pt.x, pt.y, pt.z));
                                if (step.ncCoords && step.ncCoords[0]) activeNcCoords.push(step.ncCoords[0]);
                            }
                            break;
                        }

                        if (step.linePoints) {
                            step.linePoints.forEach(p => {
                                const pt = getAdjustedPoint(p, step);
                                combinedLineVecs.push(new THREE.Vector3(pt.x, pt.y, pt.z));
                            });
                        }
                        if (step.markerPoints) {
                            step.markerPoints.forEach(p => {
                                const pt = getAdjustedPoint(p, step);
                                combinedMarkerVecs.push(new THREE.Vector3(pt.x, pt.y, pt.z));
                            });
                        }
                        if (step.ncCoords) {
                            activeNcCoords.push(...step.ncCoords);
                        }
                    }

                    if (combinedLineVecs.length > 0) {
                        const lineGeo = new THREE.BufferGeometry().setFromPoints(combinedLineVecs);
                        currentLineMesh = new THREE.Line(lineGeo, lineMaterial);
                        scene.add(currentLineMesh);
                    }

                    if (combinedMarkerVecs.length > 0) {
                        const pointsGeo = new THREE.BufferGeometry().setFromPoints(combinedMarkerVecs);
                        currentPointsMesh = new THREE.Points(pointsGeo, pointsMaterial);
                        scene.add(currentPointsMesh);
                    }
                }

                redrawSteps();

                document.getElementById('btn-first').addEventListener('click', () => {
                    if (steps.length > 0) {
                        currentStepIndex = 0;
                        redrawSteps();
                    }
                });

                document.getElementById('btn-prev').addEventListener('click', () => {
                    if (currentStepIndex > 0) {
                        currentStepIndex--;
                        redrawSteps();
                    }
                });

                document.getElementById('btn-next').addEventListener('click', () => {
                    if (currentStepIndex < steps.length - 1) {
                        currentStepIndex++;
                        redrawSteps();
                    }
                });

                document.getElementById('btn-last').addEventListener('click', () => {
                    if (steps.length > 0) {
                        currentStepIndex = steps.length - 1;
                        redrawSteps();
                    }
                });

                const center = new THREE.Vector3(0, 0, 0);
                let maxDim = 200;
                if (parsedData.minX !== undefined && parsedData.minX !== Infinity) {
                    center.set(
                        (parsedData.minX + parsedData.maxX) / 2,
                        (parsedData.minY + parsedData.maxY) / 2,
                        (parsedData.minZ + parsedData.maxZ) / 2
                    );
                    const sizeX = parsedData.maxX - parsedData.minX;
                    const sizeY = parsedData.maxY - parsedData.minY;
                    const sizeZ = parsedData.maxZ - parsedData.minZ;
                    maxDim = Math.max(sizeX, sizeY, sizeZ, 100);
                }

                const coordinatePrecision = Math.max(
                    Math.abs(center.x),
                    Math.abs(center.y),
                    Math.abs(center.z)
                ) * Number.EPSILON * 16;
                controls.minDistance = Math.max(maxDim * 1e-7, coordinatePrecision * 4);
                const sceneRadius = center.length() + maxDim * 2 + 500;

                camera.position.set(center.x - maxDim * 1.3, center.y + maxDim * 1.5, center.z + maxDim * 1.3);
                camera.far = camera.position.distanceTo(center) + sceneRadius;
                camera.updateProjectionMatrix();
                controls.target.copy(center);
                controls.update();

                const referencePanDistance = camera.position.distanceTo(controls.target);
                function updatePanSpeed() {
                    const distance = camera.position.distanceTo(controls.target);
                    controls.panSpeed = Math.min(
                        referencePanDistance / Math.max(distance, controls.minDistance),
                        1e8
                    );
                }
                updatePanSpeed();

                const zoomDirection = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
                renderer.domElement.addEventListener('wheel', (event) => {
                    event.preventDefault();

                    let delta = event.deltaY;
                    if (event.deltaMode === 1) delta *= 40;
                    else if (event.deltaMode === 2) delta *= 800;

                    if (!Number.isFinite(delta) || delta === 0) return;

                    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
                    const distance = offset.length();
                    if (distance > 0) zoomDirection.copy(offset).divideScalar(distance);
                    else offset.copy(zoomDirection);

                    const zoomSpeed = maxDim * 0.001;
                    const newDistance = THREE.MathUtils.clamp(
                        distance + delta * zoomSpeed,
                        controls.minDistance,
                        controls.maxDistance
                    );

                    offset.copy(zoomDirection).multiplyScalar(newDistance);
                    camera.position.copy(controls.target).add(offset);
                    camera.near = Math.max(controls.minDistance * 0.1, Math.min(0.1, newDistance * 0.01));
                    camera.far = newDistance + sceneRadius;
                    camera.updateProjectionMatrix();
                    updatePanSpeed();
                    controls.update();
                }, { passive: false });

                const raycaster = new THREE.Raycaster();
                if (!raycaster.params.points) raycaster.params.points = {};
                raycaster.params.points.threshold = 40;

                const mouse = new THREE.Vector2();
                const tooltip = document.getElementById('tooltip');

                window.addEventListener('mousemove', (event) => {
                    if (!currentPointsMesh) return;

                    const rect = renderer.domElement.getBoundingClientRect();
                    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                    raycaster.setFromCamera(mouse, camera);
                    const intersects = raycaster.intersectObject(currentPointsMesh);

                    if (intersects.length > 0) {
                        const index = intersects[0].index;
                        if (index !== undefined && activeNcCoords[index]) {
                            const coord = activeNcCoords[index];
                            tooltip.style.display = 'block';
                            tooltip.style.left = (event.clientX + 15) + 'px';
                            tooltip.style.top = (event.clientY + 15) + 'px';
                            tooltip.innerHTML = '<b>Step [ ' + index + ' ]</b><br>X: ' + coord.x.toFixed(3) + '<br>Y: ' + coord.y.toFixed(3) + '<br>Z: ' + coord.z.toFixed(3);
                        }
                    } else {
                        tooltip.style.display = 'none';
                    }
                });

                const axesScene = new THREE.Scene();
                const axesCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
                axesCamera.position.set(0, 0, 100);

                const axisLength = 30;
                const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(axisLength, 0, 0)]);
                axesScene.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: 0xff0000 })));

                const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0, 0, -axisLength)]);
                axesScene.add(new THREE.Line(yGeo, new THREE.LineBasicMaterial({ color: 0x00ff00 })));

                const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0, axisLength, 0)]);
                axesScene.add(new THREE.Line(zGeo, new THREE.LineBasicMaterial({ color: 0x0000ff })));

                function createLabel(text, color, pos) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.font = 'bold 48px sans-serif';
                    ctx.fillStyle = color;
                    ctx.textAlign = 'center';
                    ctx.fillText(text, 32, 48);
                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.copy(pos);
                    sprite.scale.set(20, 20, 1);
                    return sprite;
                }

                axesScene.add(createLabel('X', 'red', new THREE.Vector3(38, 0, 0)));
                axesScene.add(createLabel('Y', 'green', new THREE.Vector3(0, 0, -38)));
                axesScene.add(createLabel('Z', 'blue', new THREE.Vector3(0, 38, 0)));

                window.addEventListener('resize', () => {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                });

                function animate() {
                    requestAnimationFrame(animate);
                    updatePanSpeed();
                    controls.update();

                    renderer.clear();
                    renderer.render(scene, camera);

                    renderer.clearDepth();

                    axesCamera.quaternion.copy(camera.quaternion);
                    const axesDist = 100;
                    const cameraDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
                    axesCamera.position.copy(cameraDir.multiplyScalar(axesDist));
                    axesCamera.lookAt(0, 0, 0);

                    const axesSize = 100;
                    renderer.setViewport(window.innerWidth - axesSize - 10, window.innerHeight - axesSize - 10, axesSize, axesSize);
                    renderer.render(axesScene, axesCamera);

                    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
                }
                animate();

            } catch (err) {
                console.error("Error in Webview script:", err);
                document.body.innerHTML = '<div style="color:red; padding:20px;">Error: ' + err.message + '</div>';
            }
        </script>
    </body>
    </html>`;
}
//# sourceMappingURL=viewerHtml.js.map