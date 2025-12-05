# Family Generations Graph Visualization

A dynamic family tree visualization built with **Angular 19** and **D3.js**. This application visualizes hierarchical family data with support for filtering, expanding/collapsing generations, and highlighting relationships.

## 🛠 Tech Stack

- **Framework**: Angular 19 (Modular Architecture)
- **Visualization**: D3.js (v7)
- **Styling**: Bootstrap 5 + SCSS
- **State Management**: Angular Signals

## 📦 Prerequisites

- **Node.js**: v18.19.1 or higher (Required for Angular 19)
- **npm**: v10+

## 🚀 Getting Started

### 1. Clone & Install
Extract the source code or clone the repository, then install dependencies:

```bash
npm install
```

### 2. Run Development Server
Start the local development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## 🏗 Features

- **Interactive Graph**:
  - **Drag**: Drag nodes to rearrange them (physics-based).
  - **Zoom/Pan**: Scroll to zoom, drag background to pan.
  - **Expand/Collapse**: Click on a node to show/hide its descendants.
- **Smart Layout**:
  - Uses a modified D3 Force Simulation to enforce a **Vertical Tree Layout**.
  - Nodes are aligned in rows based on their `generation` property.
  - The **Family Root** title floats distinctly at the top.
- **Advanced Logic**:
  - **Spouse Synchronization**: Expanding a person automatically reveals their spouse.
  - **Skeleton View**: Ancestors of matched nodes are always visible to preserve context.
  - **Recursive Highlighting**: Selecting a node highlights the full path to ancestors and descendants.
- **Filters**: Filter nodes by Gender, City, and Alive/Deceased status.

## 📋 Assumptions & Limitations

### Assumptions
1.  **Data Structure**: The JSON data must strictly follow the provided schema. Specifically, nodes must have a numeric `generation` property to calculate their vertical position.
2.  **Spouse Data**: Spouses must be linked via a link object with `relation: "spouse"`.
3.  **Root Node**: There is exactly one node with `type: "familyRoot"` which acts as the title anchor.

### Limitations
1.  **Browser Performance**: The visualization uses SVG. While highly interactive, performance may degrade with very large datasets (1000+ nodes) compared to Canvas-based rendering.
2.  **Vertical Constraints**: The layout enforces vertical rows. If a generation has too many siblings/cousins, the row will become very wide, requiring horizontal scrolling/panning.
3.  **Asset Loading**: The `family-graph.json` is loaded via HTTP. In a real-world scenario, this might need error handling for network failures or a loading spinner state.