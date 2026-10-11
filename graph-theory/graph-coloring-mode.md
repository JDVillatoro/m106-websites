Graph Coloring Mode Specification

This mode has two possible trial types:

1. **Freeform coloring**
2. **Greedy coloring algorithm**

Each new question randomly chooses one of these two cases.


Basic shared interface
------
[Reset]
Here is a graph...
Can you color the graph?
[Graph Display Window]
Hint: It can be helpful to arrange the vertices in a way where there are not too many crossings.

Vertex 1  [Dropdown]
Vertex 2  [Dropdown]
...
Vertex n  [Dropdown]
[Submit]

As the user selects colors, the graph display updates in real time:
- Node fill color changes immediately.
- Vertex labels include a color alias (e.g. `1: R` or `1: A` depending on case).


Case A — Freeform coloring
--------------------------

Prompt text:

`Color the graph using at most (number) colors.`

Allowed dropdown options are the first N of:
- Red, Green, Blue, Yellow, Purple, Orange

Color aliases used in the graph labels:
- R, G, B, Y, P, O

Correctness:
- User must provide a valid proper coloring (adjacent vertices have different colors).
- If valid, user is correct.
- Feedback distinguishes:
	- valid but not minimal
	- valid and minimal

Incorrect feedback:
- Reports an edge conflict in the format:
	- Vertex X and Vertex Y are both colored (color) and are connected by an edge.


Case B — Greedy coloring algorithm
----------------------------------

Prompt text:

## Use the greedy coloring algorithm to color the graph.
Your color choices are A, B, C, D, E and F (in that order).

The greedy coloring algorithm says to go through each vertex in the specified order and color the graph using the first allowed color.

The UI also shows the required vertex order explicitly.

Dropdown options:
- A, B, C, D, E, F

Color mapping (for node fill + internal color meaning):
- A = Red
- B = Green
- C = Blue
- D = Yellow
- E = Purple
- F = Orange

Correctness:
- User is correct only if their coloring exactly matches greedy choices for the shown order.

Incorrect feedback:
- Reports the first vertex in the required order that is incorrect.


Generation rules
----------------

Graph flavor distribution:
- Bipartite graphs (2-colorable): 25%
- Planar graphs (4-colorable): 50%
- Graphs containing a K5 subgraph (5-colorable): 25%

All generated graphs are constrained to have chromatic number at most 5.

For freeform prompt limit:
- Let `m` = minimal chromatic number.
- Prompt uses `m + 1` colors **unless** `m + 1 == number of vertices`, in which case it uses `m`.
- Prompt limit is capped at 6 to align with the 6 available color slots.


Scoring and controls
--------------------

- Submit evaluates current attempt.
- Reset clears score and starts a new question.
- Try Again / Next Question rerolls a new question without resetting score.
- Score panel shows:
	- Questions
	- Points earned
	- Score percentage

