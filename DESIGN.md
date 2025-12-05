# Design & Architecture

## 1. Architecture Overview
The application follows a **Model-View-ViewModel (MVVM)** pattern adapted for Angular 19.

- **Data Layer (Model)**: Defined in `models.ts`. Raw JSON data is fetched via `FamilyDataService`.
- **State Layer (ViewModel)**: `GraphStateService` acts as the single source of truth. It uses 

**Angular Signals** to manage:
  - Raw Data
  - Filter Criteria
  - Expansion State (`Set<string>`)
  - **Computed Visibility**: A sophisticated `computed()` signal derives the exact subset of nodes and links to render based on filtering, ancestors logic, and spouse rules.
- **View Layer**: 
  - `FamilyGraphComponent`: Handles the D3 visualization. It is "dumb" regarding logic—it simply renders whatever data the Service emits.
  - `FamilyFiltersComponent`: Provides UI controls to mutate the Service state.

## 2. D3 Visualization Strategy
Instead of using a static tree layout (like `d3.tree`), which struggles with multi-parent graphs (like spouses), I utilized a **Constraint-Based Force Simulation**:

- **Layout**: Nodes are free-floating but constrained by:
  - `forceY`: Pushes nodes to specific Y-coordinates based on their `generation * 180`. This creates the "Row" effect of a tree while allowing organic movement.
  - `forceX`: Weakly centers the graph horizontally.
  - `forceCollide`: Prevents node overlap.
- **Connection Lines**:
  - **Spouses**: Straight dashed lines.
  - **Parent-Child**: Cubic Bézier curves calculated dynamically during the simulation tick to create smooth vertical "flow" lines.

## 3. Key Algorithms
- **Recursive Expansion/Collapse**: When a node is toggled, a recursive DFS algorithm traverses the tree to ensure consistency (e.g., closing a parent strictly closes all grandchildren).
- **Spouse Synchronization**: An iterative pass in the visibility logic ensures that if Node A is visible, their spouse Node B is automatically included, preventing "orphan" nodes.

## 4. Future Improvements
If I had more time, I would implement:

1.  **Virtualization / Canvas Rendering**: Switch from SVG to HTML5 Canvas to support datasets with 10,000+ nodes without DOM lag.
2.  **Minimap**: A small navigator window in the corner to help orient the user when zoomed in deep on a large tree.
3.  **Bi-directional Layout Support**: A toggle to switch between Vertical (Top-Down) and Horizontal (Left-Right) layouts dynamically.
4.  **Edit Capabilities**: Add forms to allow users to Add/Edit/Delete family members directly in the graph, updating the JSON structure.
5.  **Route State**: Sync the filter and selection state to the URL query params, allowing users to share links to specific views of the family tree.