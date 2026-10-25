export interface Point3D {
    x: number;
    y: number;
    z: number;
}

// 1行ごとの描画ステップデータ
export interface GCodeStep {
    linePoints: Point3D[];
    markerPoints: Point3D[];
    ncCoords: Point3D[];
    sourceLine: number;
    compensationMode?: string; // 'G41' | 'G42' | 'G40'
    dCode?: string;            // 使用されているD値（例: 'D45'）
}

export interface ParsedGCodeResult {
    steps: GCodeStep[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
    dValues: string[];
}

function generateArcPoints(
    xs: number, ys: number, zs: number,
    xe: number, ye: number, ze: number,
    r: number | null, i: number | null, j: number | null,
    isClockwise: boolean
) {
    let xc: number, yc: number, radius: number;
    
    if (i !== null || j !== null) {
        const iv = i !== null ? i : 0;
        const jv = j !== null ? j : 0;
        xc = xs + iv;
        yc = ys + jv;
        radius = Math.sqrt(iv * iv + jv * jv);
    } else if (r !== null) {
        radius = Math.abs(r);
        const dx = xe - xs;
        const dy = ye - ys;
        const d = Math.sqrt(dx * dx + dy * dy);
        
        if (d === 0) return null;
        if (radius < d / 2) radius = d / 2;
        
        const mx = (xs + xe) / 2;
        const my = (ys + ye) / 2;
        const h = Math.sqrt(Math.max(0, radius * radius - (d / 2) * (d / 2)));
        
        const udx = dx / d;
        const udy = dy / d;
        
        let nx = isClockwise ? udy : -udy;
        let ny = isClockwise ? -udx : udx;
        
        const rSign = r < 0 ? -1 : 1;
        xc = mx + nx * h * rSign;
        yc = my + ny * h * rSign;
    } else {
        const dx = xe - xs;
        const dy = ye - ys;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d === 0) return null;
        
        radius = d * 0.75;
        const mx = (xs + xe) / 2;
        const my = (ys + ye) / 2;
        const h = Math.sqrt(Math.max(0, radius * radius - (d / 2) * (d / 2)));
        const udx = dx / d;
        const udy = dy / d;
        let nx = isClockwise ? udy : -udy;
        let ny = isClockwise ? -udx : udx;
        xc = mx + nx * h;
        yc = my + ny * h;
    }
    
    const startAngle = Math.atan2(ys - yc, xs - xc);
    const endAngle = Math.atan2(ye - yc, xe - xc);
    
    let angleSpan = endAngle - startAngle;
    if (isClockwise) {
        while (angleSpan >= 0) angleSpan -= 2 * Math.PI;
        if (Math.abs(angleSpan) < 1e-5 && (xs !== xe || ys !== ye)) {
            angleSpan = -2 * Math.PI;
        }
    } else {
        while (angleSpan <= 0) angleSpan += 2 * Math.PI;
        if (Math.abs(angleSpan) < 1e-5 && (xs !== xe || ys !== ye)) {
            angleSpan = 2 * Math.PI;
        }
    }
    
    const markerSteps = Math.max(1, Math.ceil(Math.abs(angleSpan) / (Math.PI / 2)));
    const lineSteps = Math.max(1, Math.ceil(Math.abs(angleSpan) / (Math.PI / 36)));
    const arcLinePoints: Point3D[] = [];
    const arcPoints: Point3D[] = [];
    const arcCoords: Point3D[] = [];
    
    for (let step = 1; step <= lineSteps; step++) {
        const t = step / lineSteps;
        const angle = startAngle + angleSpan * t;
        const x = xc + radius * Math.cos(angle);
        const y = yc + radius * Math.sin(angle);
        const z = zs + (ze - zs) * t;
        arcLinePoints.push({ x, y: z, z: -y });
    }

    for (let step = 1; step <= markerSteps; step++) {
        const t = step / markerSteps;
        const angle = startAngle + angleSpan * t;
        const x = xc + radius * Math.cos(angle);
        const y = yc + radius * Math.sin(angle);
        const z = zs + (ze - zs) * t;
        arcCoords.push({ x, y, z });
        arcPoints.push({ x, y: z, z: -y });
    }
    
    return { linePoints: arcLinePoints, points: arcPoints, coords: arcCoords };
}

export function parseGCode(rawGCode: string): ParsedGCodeResult {
    const lines = rawGCode
        .replace(/\([^)]*\)/g, (comment) => comment.replace(/[^\r\n]/g, ''))
        .replace(/;[^\r\n]*/g, '')
        .split(/\r?\n/)
        .flatMap((line, sourceLine) => line
            .split(/\s{2,}|(?=G\d+(?:\.\d+)?(?=[A-Z\s]|$))/i)
            .filter((text) => text.trim().length > 0)
            .map((text) => ({ text, sourceLine })));

    const steps: GCodeStep[] = [];
    const dValuesSet = new Set<string>();
    
    // マクロ変数代入の追跡用マップ (例: { "900": "045" })
    const macroVariables: { [key: string]: string } = {};

    let currentNcCoord: Point3D = { x: 0, y: 0, z: 0 };
    let motionMode = 'G01';
    let coordMode = 'G90';
    let returnMode = 'G98';

    let compensationMode = 'G40';
    let currentDCode: string | undefined = undefined;

    let cycleZ: number | null = null;
    let cycleR: number | null = null;
    let initialZ: number = 0;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    lines.forEach(({ text: line, sourceLine }) => {
        // 1. マクロ変数への代入を検出（例: #900=045）
        const assignMatch = line.match(/#(\d+)\s*=\s*([0-9.]+)/i);
        if (assignMatch) {
            macroVariables[assignMatch[1]] = assignMatch[2];
        }

        // 2. D値の検出（例: D45 や D#900）
        const dMatches = line.match(/D\s*(#?\d+)/gi);
        if (dMatches) {
            dMatches.forEach(dm => {
                let cleanD = dm.replace(/\s+/g, '').toUpperCase(); // "D#900" など
                
                // もし #900 のようなマクロ変数形式であれば、代入された値に解決する
                const varMatch = cleanD.match(/D#(\d+)/);
                if (varMatch && macroVariables[varMatch[1]]) {
                    const resolvedVal = macroVariables[varMatch[1]];
                    // 数値部分を取り出し（例: "045" -> "45"）波及させる
                    const numericVal = parseInt(resolvedVal, 10).toString();
                    cleanD = 'D' + numericVal;
                }

                dValuesSet.add(cleanD);
                currentDCode = cleanD;
            });
        }

        if (/G41(?=[A-Z\s]|$)/i.test(line)) compensationMode = 'G41';
        if (/G42(?=[A-Z\s]|$)/i.test(line)) compensationMode = 'G42';
        if (/G40(?=[A-Z\s]|$)/i.test(line)) {
            compensationMode = 'G40';
            currentDCode = undefined;
        }

        if (/G0?0(?=[A-Z\s]|$)/i.test(line)) motionMode = 'G00';
        if (/G0?1(?=[A-Z\s]|$)/i.test(line)) motionMode = 'G01';
        if (/G0?2(?=[A-Z\s]|$)/i.test(line)) motionMode = 'G02';
        if (/G0?3(?=[A-Z\s]|$)/i.test(line)) motionMode = 'G03';
        if (/G80(?=[A-Z\s]|$)/i.test(line)) motionMode = 'G80';
        if (/G98(?=[A-Z\s]|$)/i.test(line)) returnMode = 'G98';
        if (/G99(?=[A-Z\s]|$)/i.test(line)) returnMode = 'G99';

        const cycleMatch = line.match(/(G8[1-9]|G7[346])/i);
        if (cycleMatch) {
            motionMode = cycleMatch[1].toUpperCase();
            initialZ = currentNcCoord.z;
        }

        if (/G90(?=[A-Z\s]|$)/i.test(line)) coordMode = 'G90';
        if (/G91(?=[A-Z\s]|$)/i.test(line)) coordMode = 'G91';

        const xMatch = line.match(/X([\d.-]+)/i);
        const yMatch = line.match(/Y([\d.-]+)/i);
        const zMatch = line.match(/Z([\d.-]+)/i);
        const rMatch = line.match(/R([\d.-]+)/i);
        const iMatch = line.match(/I([\d.-]+)/i);
        const jMatch = line.match(/J([\d.-]+)/i);

        if (zMatch) {
            const rawZ = parseFloat(zMatch[1]);
            cycleZ = coordMode === 'G91' ? currentNcCoord.z + rawZ : rawZ;
        }
        if (rMatch) {
            const rawR = parseFloat(rMatch[1]);
            cycleR = coordMode === 'G91' ? currentNcCoord.z + rawR : rawR;
        }

        const isArcMotion = motionMode === 'G02' || motionMode === 'G03';
        if (xMatch || yMatch || zMatch || (isArcMotion && (iMatch || jMatch))) {
            const rawX = xMatch ? parseFloat(xMatch[1]) : null;
            const rawY = yMatch ? parseFloat(yMatch[1]) : null;
            const rawZ = zMatch ? parseFloat(zMatch[1]) : null;

            const x = rawX !== null ? (coordMode === 'G91' ? currentNcCoord.x + rawX : rawX) : currentNcCoord.x;
            const y = rawY !== null ? (coordMode === 'G91' ? currentNcCoord.y + rawY : rawY) : currentNcCoord.y;
            const z = rawZ !== null ? (coordMode === 'G91' ? currentNcCoord.z + rawZ : rawZ) : (cycleZ !== null ? cycleZ : currentNcCoord.z);

            const r = rMatch ? parseFloat(rMatch[1]) : null;
            const i = iMatch ? parseFloat(iMatch[1]) : null;
            const j = jMatch ? parseFloat(jMatch[1]) : null;

            const stepLinePoints: Point3D[] = [];
            const stepMarkerPoints: Point3D[] = [];
            const stepNcCoords: Point3D[] = [];

            const addPt = (px: number, py: number, pz: number, origX: number, origY: number, origZ: number) => {
                const pt = { x: px, y: pz, z: -py };
                stepLinePoints.push(pt);
                stepMarkerPoints.push(pt);
                stepNcCoords.push({ x: origX, y: origY, z: origZ });
                minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
                minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
                minZ = Math.min(minZ, pt.z); maxZ = Math.max(maxZ, pt.z);
            };

            const isCannedCycle = /^G(7[346]|8[1-9])$/.test(motionMode);

            if (isCannedCycle && cycleZ !== null) {
                const rVal = cycleR !== null ? cycleR : currentNcCoord.z;
                const escapeZ = (returnMode === 'G99') ? rVal : initialZ;

                addPt(x, y, currentNcCoord.z, x, y, currentNcCoord.z);
                addPt(x, y, rVal, x, y, rVal);
                addPt(x, y, z, x, y, z);
                addPt(x, y, escapeZ, x, y, escapeZ);

                currentNcCoord = { x, y, z: escapeZ };
            } else if (isArcMotion) {
                const isClockwise = (motionMode === 'G02');
                const arcResult = generateArcPoints(
                    currentNcCoord.x, currentNcCoord.y, currentNcCoord.z,
                    x, y, z, r, i, j, isClockwise
                );

                if (arcResult) {
                    arcResult.linePoints.forEach((pt) => {
                        stepLinePoints.push(pt);
                        minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
                        minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
                        minZ = Math.min(minZ, pt.z); maxZ = Math.max(maxZ, pt.z);
                    });
                    arcResult.points.forEach((pt, idx) => {
                        stepMarkerPoints.push(pt);
                        stepNcCoords.push(arcResult.coords[idx]);
                    });
                } else {
                    addPt(x, y, z, x, y, z);
                }
                currentNcCoord = { x, y, z };
            } else {
                addPt(x, y, z, x, y, z);
                currentNcCoord = { x, y, z };
            }

            steps.push({
                linePoints: stepLinePoints,
                markerPoints: stepMarkerPoints,
                ncCoords: stepNcCoords,
                sourceLine,
                compensationMode: compensationMode !== 'G40' ? compensationMode : undefined,
                dCode: currentDCode
            });
        }
    });

    return { 
        steps, 
        minX, maxX, 
        minY, maxY, 
        minZ, maxZ, 
        dValues: Array.from(dValuesSet) 
    };
}