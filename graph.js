// Helper: split graph into connected components (undirected)
function getConnectedComponents(edges) {
    const adj = {};
    for (const edge of edges) {
        if (!adj[edge.source]) adj[edge.source] = [];
        if (!adj[edge.target]) adj[edge.target] = [];
        adj[edge.source].push(edge.target);
        adj[edge.target].push(edge.source);
    }
    const visited = new Set();
    const components = [];
    for (const v in adj) {
        if (!visited.has(v)) {
            const comp = [];
            const stack = [v];
            while (stack.length) {
                const u = stack.pop();
                if (!visited.has(u)) {
                    visited.add(u);
                    comp.push(u);
                    for (const w of adj[u]) {
                        if (!visited.has(w)) stack.push(w);
                    }
                }
            }
            components.push(comp);
        }
    }
    // Add isolated vertices
    const allVerts = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
    for (const v of allVerts) {
        if (!adj[v]) components.push([v]);
    }
    return components;
}
// Force-directed SVG layout (simple, no external libraries)
function graphToSVG(edges, width = 400, height = 400) {
    // Collect vertices, including isolated
    const vertices = {};
    for (const edge of edges) {
        vertices[edge.source] = true;
        if (edge.target !== null) vertices[edge.target] = true;
    }
    const vertexList = Object.keys(vertices);
    const n = vertexList.length;
    // Initial random positions
    const pos = {};
    for (let i = 0; i < n; i++) {
        pos[vertexList[i]] = {
            x: Math.random() * (width - 80) + 40,
            y: Math.random() * (height - 80) + 40
        };
    }
    // Simple force-directed layout (few iterations)
    const ITER = 1000;
    const REPULSION = 12000;
    const ATTRACTION = 0.05;
    // Precompute connected components
    const components = getConnectedComponents(edges);
    // Map vertex to component index
    const vToComp = {};
    components.forEach((comp, idx) => {
        for (const v of comp) vToComp[v] = idx;
    });
    for (let iter = 0; iter < ITER; iter++) {
        // Repulsion
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const v = vertexList[i], u = vertexList[j];
                let dx = pos[v].x - pos[u].x;
                let dy = pos[v].y - pos[u].y;
                let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                let force = REPULSION / (dist);
                pos[v].x += (dx / dist) * force;
                pos[v].y += (dy / dist) * force;
                pos[u].x -= (dx / dist) * force;
                pos[u].y -= (dy / dist) * force;
            }
        }
        // Attraction (normal)
        for (const edge of edges) {
            const v = edge.source, u = edge.target;
            let dx = pos[v].x - pos[u].x;
            let dy = pos[v].y - pos[u].y;
            let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
            let force = ATTRACTION * (dist * dist) / 100;
            pos[v].x -= (dx / dist) * force;
            pos[v].y -= (dy / dist) * force;
            pos[u].x += (dx / dist) * force;
            pos[u].y += (dy / dist) * force;
        }
        // Weak attraction between components
        if (components.length > 1) {
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const v = vertexList[i], u = vertexList[j];
                    if (vToComp[v] !== vToComp[u]) {
                        let dx = pos[v].x - pos[u].x;
                        let dy = pos[v].y - pos[u].y;
                        let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                        let force = (ATTRACTION * 0.5) * (dist * dist) / 100;
                        pos[v].x -= (dx / dist) * force;
                        pos[v].y -= (dy / dist) * force;
                        pos[u].x += (dx / dist) * force;
                        pos[u].y += (dy / dist) * force;
                    }
                }
            }
        }
        // Clamp positions
        for (const v of vertexList) {
            pos[v].x = Math.max(30, Math.min(width - 30, pos[v].x));
            pos[v].y = Math.max(30, Math.min(height - 30, pos[v].y));
        }
    }
    // Compute bounding box of all vertices
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of vertexList) {
        minX = Math.min(minX, pos[v].x);
        maxX = Math.max(maxX, pos[v].x);
        minY = Math.min(minY, pos[v].y);
        maxY = Math.max(maxY, pos[v].y);
    }
    // Add padding
    const PAD = 30;
    minX -= PAD; maxX += PAD; minY -= PAD; maxY += PAD;
    // Compute new width/height
    const svgWidth = maxX - minX;
    const svgHeight = maxY - minY;
    // SVG generation with viewBox
    let svg = `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${svgWidth} ${svgHeight}" style="background:#fafafa;">
        <g>`;
    // Draw edges
    const RADIUS = 18;
    // Prepare weight label positions for weighted edges
    const weightLabels = [];
    for (const edge of edges) {
        const {source, target, isDirected, weight} = edge;
        if (target === null) continue; // skip isolated for edge drawing
        let x1 = pos[source].x, y1 = pos[source].y;
        let x2 = pos[target].x, y2 = pos[target].y;
        // Shorten the line so it ends at the circle boundary
        if (isDirected || source !== target) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.01) {
                // Move start and end points to the edge of the circles
                const ratio = RADIUS / dist;
                x1 = x1 + dx * ratio;
                y1 = y1 + dy * ratio;
                x2 = x2 - dx * ratio;
                y2 = y2 - dy * ratio;
            }
        }
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="2" marker-end="${isDirected ? 'url(#arrowhead)' : ''}" />`;
        if (weight !== null) {
            weightLabels.push({
                edge,
                x1, y1, x2, y2,
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2
            });
        }
    }
    // Force-based placement for weight labels
    const boxW = 22, boxH = 18;
    const WEIGHT_ITER = 100;
    // Precompute edge crossing points for repulsion
    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        // Returns intersection point or null
        const det = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (Math.abs(det) < 1e-6) return null;
        const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / det;
        const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / det;
        if (t > 0 && t < 1 && u > 0 && u < 1) {
            return {
                x: ax + t * (bx - ax),
                y: ay + t * (by - ay)
            };
        }
        return null;
    }
    const edgeSegments = [];
    for (const edge of edges) {
        let x1 = pos[edge.source].x, y1 = pos[edge.source].y;
        let x2 = pos[edge.target].x, y2 = pos[edge.target].y;
        if (edge.isDirected || edge.source !== edge.target) {
            const dx = x2 - x1, dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.01) {
                const ratio = RADIUS / dist;
                x1 = x1 + dx * ratio;
                y1 = y1 + dy * ratio;
                x2 = x2 - dx * ratio;
                y2 = y2 - dy * ratio;
            }
        }
        edgeSegments.push({x1, y1, x2, y2});
    }
    // Find all edge crossing points
    const crossings = [];
    for (let i = 0; i < edgeSegments.length; i++) {
        for (let j = i + 1; j < edgeSegments.length; j++) {
            const s1 = edgeSegments[i], s2 = edgeSegments[j];
            const pt = segmentsIntersect(s1.x1, s1.y1, s1.x2, s1.y2, s2.x1, s2.y1, s2.x2, s2.y2);
            if (pt) crossings.push(pt);
        }
    }
    for (let iter = 0; iter < WEIGHT_ITER; iter++) {
        for (let i = 0; i < weightLabels.length; i++) {
            let label = weightLabels[i];
            // Attraction to edge midpoint
            const midX = (label.x1 + label.x2) / 2;
            const midY = (label.y1 + label.y2) / 2;
            label.x += (midX - label.x) * 0.2;
            label.y += (midY - label.y) * 0.2;
            // Repulsion from vertices
            for (const v of vertexList) {
                const vx = pos[v].x, vy = pos[v].y;
                let dx = label.x - vx, dy = label.y - vy;
                let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                if (dist < 30) {
                    let force = 200 / (dist * dist);
                    label.x += (dx / dist) * force;
                    label.y += (dy / dist) * force;
                }
                // Vertices are repelled by weight boxes
                if (dist < 40) {
                    let force = 100 / (dist * dist);
                    pos[v].x -= (dx / dist) * force;
                    pos[v].y -= (dy / dist) * force;
                }
            }
            // Repulsion from other weight labels
            for (let j = 0; j < weightLabels.length; j++) {
                if (i === j) continue;
                const other = weightLabels[j];
                let dx = label.x - other.x, dy = label.y - other.y;
                let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                if (dist < 30) {
                    let force = 200 / (dist * dist);
                    label.x += (dx / dist) * force;
                    label.y += (dy / dist) * force;
                }
            }
            // Repulsion from edge crossings
            for (const pt of crossings) {
                let dx = label.x - pt.x, dy = label.y - pt.y;
                let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                if (dist < 30) {
                    let force = 200 / (dist * dist);
                    label.x += (dx / dist) * force;
                    label.y += (dy / dist) * force;
                }
            }
        }
    }
    // Draw weight labels
    for (const label of weightLabels) {
        svg += `<rect x="${label.x - boxW/2}" y="${label.y - boxH/2}" width="${boxW}" height="${boxH}" fill="#fff" stroke="#c00" stroke-width="1.2" rx="3" ry="3" />`;
        svg += `<text x="${label.x}" y="${label.y}" font-size="12" fill="#c00" text-anchor="middle" dominant-baseline="middle">${label.edge.weight}</text>`;
    }
    // Draw vertices
    for (const v of vertexList) {
        svg += `<circle cx="${pos[v].x}" cy="${pos[v].y}" r="18" fill="#fff" stroke="#333" stroke-width="2" />`;
        svg += `<text x="${pos[v].x}" y="${pos[v].y + 5}" text-anchor="middle" font-size="14" fill="#333">${v}</text>`;
    }
    // Arrowhead marker for directed edges
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3.5, 0 7" fill="#888"/></marker></defs>`;
    svg += `</g></svg>`;
    return svg;
}
// Graph generation and manipulation logic


function generateRandomGraph(n, allowLoops, allowMultigraph, numComponents = 1) {
    // Vertex names as strings
    const vertices = Array.from({length: n}, (_, i) => `v${i}`);
    // Partition vertices into numComponents groups
    const groups = [];
    for (let i = 0; i < numComponents; i++) groups.push([]);
    for (let i = 0; i < n; i++) groups[i % numComponents].push(vertices[i]);

    const edges = [];
    const edgeSet = new Set();
    // Decide once for the whole graph
    const isDirected = Math.random() < 0.5;
    const isWeighted = Math.random() < 0.5;
    // For each group, generate a random connected subgraph, then add random extra edges
    for (const group of groups) {
        if (group.length === 1) {
            // Isolated vertex
            edges.push({
                source: group[0],
                target: null,
                isDirected: false,
                weight: null
            });
            continue;
        }
        // Ensure connected: create a random spanning tree
        const shuffled = group.slice().sort(() => Math.random() - 0.5);
        for (let i = 1; i < shuffled.length; i++) {
            const u = shuffled[i - 1];
            const v = shuffled[i];
            let key = isDirected ? `${u}->${v}` : [u, v].sort().join('--');
            if (!allowMultigraph && edgeSet.has(key)) continue;
            edgeSet.add(key);
            edges.push({
                source: u,
                target: v,
                isDirected: isDirected,
                weight: isWeighted ? Math.floor(Math.random() * 10) + 1 : null
            });
        }
        // Add random extra edges within the group
        const maxExtra = Math.max(0, group.length * (group.length - 1) / 2 - (group.length - 1));
        const numExtra = Math.floor(Math.random() * (maxExtra + 1));
        let tries = 0;
        while (edges.length < numExtra + (group.length - 1) && tries < 100 * numExtra) {
            let u = group[Math.floor(Math.random() * group.length)];
            let v = group[Math.floor(Math.random() * group.length)];
            if (!allowLoops && u === v) { tries++; continue; }
            let key = isDirected ? `${u}->${v}` : [u, v].sort().join('--');
            if (!allowMultigraph && edgeSet.has(key)) { tries++; continue; }
            edgeSet.add(key);
            edges.push({
                source: u,
                target: v,
                isDirected: isDirected,
                weight: isWeighted ? Math.floor(Math.random() * 10) + 1 : null
            });
            tries++;
        }
    }
    return edges;
}


function edgesToCSV(edges) {
    let csv = 'source,target,isDirected,weight\n';
    for (const edge of edges) {
        csv += `${edge.source},${edge.target},${edge.isDirected},${edge.weight === null ? '' : edge.weight}\n`;
    }
    return csv;
}

// Property detection functions
function isConnected(edges, n) {
    // Undirected connectivity using BFS
    if (edges.length === 0) return false;
    const vertices = Array.from({length: n}, (_, i) => `v${i}`);
    const adj = {};
    for (const v of vertices) adj[v] = [];
    for (const edge of edges) {
        adj[edge.source].push(edge.target);
        if (!edge.isDirected) adj[edge.target].push(edge.source);
    }
    const visited = new Set();
    const queue = [vertices[0]];
    while (queue.length) {
        const v = queue.shift();
        if (!visited.has(v)) {
            visited.add(v);
            for (const u of adj[v]) {
                if (!visited.has(u)) queue.push(u);
            }
        }
    }
    return visited.size === n;
}

function isMultiGraph(edges) {
    const seen = new Set();
    for (const edge of edges) {
        const key = edge.isDirected ? `${edge.source}->${edge.target}` : [edge.source, edge.target].sort().join('--');
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}

function isLoopGraph(edges) {
    return edges.some(edge => edge.source === edge.target);
}

function isWeighted(edges) {
    return edges.some(edge => edge.weight !== null);
}

function isDirected(edges) {
    return edges.some(edge => edge.isDirected);
}
