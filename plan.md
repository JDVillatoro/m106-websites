OK, we're going to add a new mode. Eulerian Trails. You may need to poke around and get an understanding for how the code for this website works before starting the job.

We should be able to select this new mode with a mode selection button like the other modes. The UI should be modeled on the UI for the other modes, especially the degree sequences mode. It should have a reset button, a score, a window for viewing a graph, and other similar features to the Degree Sequences mode.

In the Eulerian Trails mode it will generate a random graph. Here is the description of the graph generation logic:

1/6 of the time it will generate a Eulerian digraph.
1/6 of the time it will generate a non-Eulerian digraph by first generating an Eulerian one and then deleting one edge. The deleted edge should be chosen in such a way that it does not break strongly connectedness.
1/6 of the time it will generate an Eulerian simple graph.
1/6 of the time it will generate a connected (non-eulerian) graph by deleting between one and two edges from an Eulerian graph.
1/6 of the time it will generate an Eulerian multigraph.
1/6 of the time it will generate a non-Eulerian multigraph by deleting between one and two edges to make the multigraph non-Eulerian.

When displaying the graphs, it should label the vertices with captial letters. The edges should be unlabeled except in the multigraph case in which case they should be labeled with lowercase letters.

The prompt will be to ask the user to determine if the graph is Eulerian or not by clicking a button. If user clicks non-Eulerian (and they are correct) they will be offered a "bonus" where they are asked to find an "Eulerization". This should work by having the user specify edges to add by giving giving From and To values for each edge they add. See the edge adding feature in the make a graph mode for some ui inspiration. The user should not be required to preserve simpleness when Eulerizing.

If the user clicks Eulerian (and they are correct) they will be asked a bonus which is to identify an Eulerian path. In the non-multigraph case the user should input the path as a string of captial letters representing the path. In the multigraph case, they should input as a string of alternating capital and lowercase letters to specify which edges are involved in the pathh

After submitting their answer it should report the result and prompt them to try again.
