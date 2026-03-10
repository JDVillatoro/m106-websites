Basic interface

Part 1 UI
------
[Reset]
Here is a graph...
Can you tell if it's a planar graph?
[Graph Display Window]
Hint: Try clicking and dragging the vertices to see if you can untangle the graph.

Part 1 - Is the graph planar?
[Planar] [Not Planar]


Part 2 UI - Planar Case
--------------------

Here is a graph...
Can you tell if it's a planar graph?
[Graph Display Window]
Hint: Try clicking and dragging the vertices to see if you can untangle the graph.

That's right the graph is planar!

Part 2 - How many vertices, edges, and faces does this graph have?
Vertices: [Number input box]
Edges: [Number input box]
Faces: [Number input box]
[Submit]

Part 2 UI - Non-Planar Case
---------------------------

Here is a graph...
Can you tell if it's a planar graph?
[Graph Display Window]
Hint: Try clicking and dragging the vertices to see if you can untangle the graph.

That's right the graph is not planar!

Part 2 - Can you tell why?
[It contains a K5 subgraph] [It contains a K3,3 subgraph]


Feedback message
Part 1 Incorrect
----------------------------

Incorrect! Actually this graph is (planar/not planar).
[Try again]

Part 2 Planar Case Incorrect
----------------------------

Incorrect! The graph has (number) vertices, (number) edges, and (number) faces.
[Try again]


Part 2 Non Planar Case Correct
----------------------------

Correct! This graph contains a (K5/K3,3) subgraph.
[Next Question]


Part 2 Planar Case Correct
----------------------------

Correct! That's the correct number of vertices, edges and faces.
[Next Question]


--- Notes ---

Graph Generation Logic: For the graph generation, we will need a way of generating random planar graphs. The non-planar graphs we generate will need to be generated in a way that ensures they contain either a K5 or K3,3 subgraph. For generating non-planar graphs our strategy should be to first generate a planar graph, afterwards, we will add edges in a way to guarentee the presence of a K5 or K3,3 subgraph. In order to keep the graphs from being too obvious, after this we will remove edges that are not part of the K5 or K3,3 subgraph to make sure that the number of edges is roughly the same as the original planar graph. When adding edges to form K5 or K3,3, we should try to make sure we don't need to add "too many" new edges so we should look for a highly connected subgraph of 5 or 6 vertices.

The graph generation logic should be written in a way that is reasonably siloed because tuning difficulty will rely on being able to adjust the graph generation code. Include several parameters to help with difficulty tuning.

Like with the other modes, there should be score tracking. The reset button should reset the score and reroll the problem. The "Next Question" and "Try Again" should not reset the score but reroll the problem. The score should be displayed in a score panel that reports the number of questions, points earned, and score as a percentage of possible points.