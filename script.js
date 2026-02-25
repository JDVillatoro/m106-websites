document.getElementById('graph-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const numVertices = parseInt(document.getElementById('vertices').value, 10);
    const allowLoops = document.getElementById('loop').checked;
    const allowMultigraph = document.getElementById('multigraph').checked;
    const numComponents = parseInt(document.getElementById('components').value, 10);

    // Use functions from graph.js
    const edges = generateRandomGraph(numVertices, allowLoops, allowMultigraph, numComponents);
    const csv = edgesToCSV(edges);

    // Detect properties
    const properties = [
        `Connected: ${isConnected(edges, numVertices)}`,
        `MultiGraph: ${isMultiGraph(edges)}`,
        `LoopGraph: ${isLoopGraph(edges)}`,
        `Weighted: ${isWeighted(edges)}`,
        `Directed: ${isDirected(edges)}`
    ];

    const svg = graphToSVG(edges);
    document.getElementById('csv-output').innerHTML =
        `<h2>CSV Output</h2><pre>${csv}</pre>` +
        `<h3>Detected Properties</h3><ul>` +
        properties.map(p => `<li>${p}</li>`).join('') +
        `</ul>` +
        `<h3>Graph Visualization</h3>${svg}`;
});
