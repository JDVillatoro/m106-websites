# Hamiltonian Graphs Mode

## Overview

In this mode, the user is presented with a graph and is asked if the graph is Hamiltonian. They can decide either that the graph is Hamiltonian or not. If the graph is not Hamiltonian, then the puzzle asks them to specify the reason why the graph is not hamiltonian. The options presented will be: the graph has a cut vertex, the graph has a leaf, and the graph is bipartite with non-equal partition sizes. If the graph is Hamiltonian, then the user is asked to find a Hamiltonian cycle according to one of three strategies: Freeform, Nearest Neighbor with a specified starting point or Sorted Edge. The graph will be generated with weights as well as A-Z labels for the vertices. The weights will only be revealed if the problem requests the specific strategy for finding a Hamiltonian cycle and after the user has made their choice about whether the graph is Hamiltonian or not. The weights will be assigned in a way that ensures that the specified strategy will succeed in finding a Hamiltonian cycle if one exists.

**Note**
The nearest neighbor strategy says that you start at some point, and then you always choose the shortest path that takes you to a vertex you haven't visited yet. The sorted edge strategy says that you try to construct a path by picking edges according to the following rule: you pick the smallest weight edge that doesn't form a non-Hamiltonian cycle when joined with the edges picked so far and doesn't touch a vertex that is already touching two chosen edges.

## Graph Generation

The graph generation process is as follows: 25% of the time the graph generated must not be Hamiltonian. Furthermore, it must be non-Hamiltonian for at least one of the specific reasons specified:
- There is a cut vertex: A vertex whose removal results in an increase in the number of connected components of the graph.
- There is a leaf: A vertex with degree 1.
- The graph is bipartite with non-equal partition sizes: A graph whose vertices can be divided into two disjoint sets such that no two vertices within the same set are adjacent, and the sizes of the two sets are not equal.

Technically, if there is a leaf then there is also a cut vertex so we will allow both answers in case of a leaf but the feedback should mention that there is a leaf.

In order to generate non-Hamiltonian graphs, we will have one strategy for each of the three reasons. To generate a graph with a cut vertex, we will randomly generate two smallish graphs and join them at a single vertex. To generate a graph with a leaf, we will randomly generate a mediumish graph and then add a random leaf to it. To generate a bipartite graph with non-equal partition sizes, we will randomly generate two sets of vertices of different sizes and then add edges randomly until the graph is connected.

To generate Hamiltonian graphs, we will have two cases. We want finding a Hamiltonian cycle to be solvable using the algorithm specified. There is always a chance the algorithm hits a dead end so we will need to work backwards to ensure that the graph generated is solvable by the algorithm. 

For the Nearest Neighbor strategy, we will start with a cycle graph and then order the edges in a way that agrees with the cycle structure. We will then add edges randomly. After adding an edge we will insert it into the existing ordering of the edges randomly with the constraint that the inserted edge must not change the result of the nearest neighbor strategy. This can be accomplished by just testing all of the possible places it could be inserted into the ordering (including inserting as the last) and then randomly choosing among the valid insertion orders. This should be done until the graph has a relatively high density of edges. After adding edges is done and the ordering is obtained, the edges will be assigned weights 1,2,3...,n according to the ordering we found.

For the sorted edge strategy, we do a similar algorithm, except the ordering on the edges in the initial cycle is chosen randomly rather than being determined by the cycle structure. When we add edges, we will insert them into the ordering randomly with the constraint that the inserted edge must not change the result of the sorted edge strategy. This can be accomplished by just testing all of the possible places it could be inserted into the ordering (including inserting as the last) and then randomly choosing among the valid insertion orders. This should be done until the graph has a relatively high density of edges. After adding edges is done and the ordering is obtained, the edges will be assigned weights 1,2,3...,n according to the ordering we found.

For the Freeform strategy, the graph is generated randomly with the constraint that it must contain a Hamiltonian cycle. We can reuse the sorted edge strategy generation logic for this case but the weights will not be displayed and the user will simply be asked to specify a Hamiltonian cycle without any constraints on how they find it or its optimality.

The graphs generated should have between 4 and 8 vertices. The exact range of vertices as well as total edge count and density threshhold should be determined by a parameter that is tuned for difficulty. The logic flow should first be to construct the desired Hamiltonian cycle, then add edges until it exceeds the cap on the total edge count or density cap. For the non-Hamiltonian graphs we can utilize the existing simple graph generation logic in combination with modifying the resulting graph to ensure it meets the desired non-Hamiltonian criteria.

The puzzle should be responsive to multiple correct answers. Since the sorted edge case does not specify a starting point, it should accept any Hamiltonian cycle that uses the correct edges. For identifying the reason for not being Hamiltonian, it should take into account that some graphs may have multiple reasons for not being Hamiltonian (e.g. a graph with a leaf also has a cut vertex) and should accept all valid reasons.

## User interface

[Reset]
Here is a graph...
Can you tell if it's a Hamiltonian graph?
[Graph Display Window]
Hint: Try clicking and dragging the vertices to get a better look.

Part 1 - Is the graph Hamiltonian?
[Hamiltonian] [Not Hamiltonian]

Part 2 - Hamiltonian Case - Freeform
------------------------------------

That's right the graph is Hamiltonian!
Specify a Hamiltonian cycle by listing the vertices in order.
[Text input box]
[Submit]

Part 2 - Hamiltonian Case - Nearest Neighbor
------------------------------------
That's right the graph is Hamiltonian!
Find a Hamiltonian cycle using the nearest neighbor strategy. Start at the vertex (letter) and use the displayed weights to determine the nearest neighbor at each step.
[Text input box]
[Submit]

Part 2 - Hamiltonian Case - Sorted Edge
------------------------------------
That's right the graph is Hamiltonian!
Find a Hamiltonian cycle using the sorted edge strategy. Use the displayed weights to determine the order in which to consider the edges.
[Text input box]
[Submit]

Part 2 - Non-Hamiltonian Case
----------------------------
That's right the graph is not Hamiltonian!
Can you tell why?
[It contains a leaf] 
[It contains a cut vertex] 
[It is bipartite with non-equal partition sizes]

Feedback message
Part 1 Incorrect
----------------------------

Incorrect! Actually this graph is (Hamiltonian/Not Hamiltonian).
[Try again]

Part 2 Hamiltonian Case Freeform Incorrect
----------------------------
Sorry, that's not a valid Hamiltonian cycle. (It's not a valid path/It doesn't start and end at the same vertex/It visits vertex (letter) more than once/It doesn't visit vertex (letter))
[Let Me Try Again][Try a different one]

Part 2 Hamiltonian Case Nearest Neighbor Incorrect
----------------------------
Sorry, that's not the Hamiltonian cycle obtained by the nearest neighbor strategy. (It doesn't start at the correct vertex/At step (number) the nearest neighbor is vertex (letter) but you chose vertex (letter)/You didn't complete the cycle).
[Let Me Try Again][Try a different one]

Part 2 Hamiltonian Case Sorted Edge Incorrect
----------------------------
Sorry, that's not the Hamiltonian cycle obtained by the sorted edge strategy. The Sorted Edge strategy doesn't include edge (letter, letter)/The sorted edge strategy should have included edge (letter, letter).
[Let Me Try Again][Try a different one]

Part 2 Non-Hamiltonian Case Incorrect
----------------------------
Incorrect! The graph is not Hamiltonian because (reason).
[Try again]


