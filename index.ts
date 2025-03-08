import {
    Engine,
    Render,
    Runner,
    Bodies,
    Composite,
    Events,
    Mouse,
    MouseConstraint,
    Constraint,
} from 'matter-js';
import * as Matter from 'matter-js';
import { Graph } from './graph';
import { 
    getComponentColor, 
    toggleFullscreen, 
    createStatsPanel, 
    updateStatsPanel,
    showGiantComponentNotification,
    showCycleDetails
} from './utils';

type Node = Matter.Body & { 
    labelText: string;
    componentId: number; // Track which component the node belongs to
    highlighted: boolean; // For highlighting nodes in cycles
};

// Create engine
const engine = Engine.create();
engine.gravity.y = 0;

// Target the demo container
const demoElement = document.querySelector('.matter-demo') as HTMLElement;

// Create renderer
const render = Render.create({
    element: demoElement,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#14151f',
        showAngleIndicator: false
    }
});

// Create runner
const runner = Runner.create();

// Global variables to store simulation state
let nodes: Node[] = [];
let graph: Graph;
let components: number[][] = []; // Store the components of the graph
let cycles: number[][] = []; // Store detected cycles
let edgeProbability = 0.05; // Initial probability for Erdős-Rényi model
let edgeCount = 0;
let maxEdges = 0; // Maximum possible edges in the graph
let giantComponentSize = 0; // Size of the largest component
let giantComponentThreshold = false; // Whether we've crossed the threshold for giant component
let statsPanel: HTMLElement;
let highlightedCycle: number[] | null = null; // Currently highlighted cycle

// Set up UI elements
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const addConnectionBtn = document.getElementById('add-connection-btn') as HTMLButtonElement;

/**
 * Update stats display and UI
 */
function updateStats() {
    if (!statsPanel) {
        statsPanel = createStatsPanel(demoElement);
    }
    
    // Calculate n(n-1)/2 which is the max possible edges in an undirected graph
    const n = nodes.length;
    maxEdges = (n * (n - 1)) / 2;
    
    // Theoretical threshold for giant component in Erdős-Rényi model: p = 1/n
    const thresholdP = 1 / n;
    const currentP = edgeCount / maxEdges;
    
    // Check if we've crossed the threshold
    const wasGiantComponent = giantComponentThreshold;
    giantComponentThreshold = currentP >= thresholdP;
    
    // Show notification if giant component just formed
    if (!wasGiantComponent && giantComponentThreshold) {
        showGiantComponentNotification(demoElement);
    }
    
    // Update stats display with callbacks for UI controls
    updateStatsPanel(
        statsPanel,
        {
            nodes,
            edgeCount,
            maxEdges,
            edgeProbability,
            components,
            giantComponentSize,
            giantComponentThreshold,
            cycleCount: cycles.length,
            onProbabilityChange: (prob) => {
                edgeProbability = prob;
                updateStats();
            },
            onStepClick: () => addRandomConnectionWithProbability(),
            onAutoClick: () => {}, // This is handled in the updateStatsPanel function
            onHighlightCycles: () => highlightRandomCycle()
        }
    );
}

/**
 * Find connected components in the graph
 */
function findComponents() {
    if (!graph) return [];

    const n = nodes.length;
    const visited = new Array(n).fill(false);
    const componentAssignment = new Array(n).fill(-1);
    components = [];

    for (let i = 0; i < n; i++) {
        if (!visited[i]) {
            const component: number[] = [];
            dfs(i, visited, component);
            components.push(component);
            
            // Assign component ID to each node
            component.forEach(nodeIndex => {
                componentAssignment[nodeIndex] = components.length - 1;
            });
        }
    }

    // Find the size of the largest component
    giantComponentSize = Math.max(...components.map(comp => comp.length));

    // Assign component IDs to nodes
    nodes.forEach((node, index) => {
        node.componentId = componentAssignment[index];
    });

    // After finding components, detect cycles
    detectCycles();

    return components;

    // Helper function for DFS
    function dfs(v: number, visited: boolean[], component: number[]) {
        visited[v] = true;
        component.push(v);
        
        for (const neighbor of graph.adjList[v]) {
            if (!visited[neighbor]) {
                dfs(neighbor, visited, component);
            }
        }
    }
}

/**
 * Set up the simulation
 */
function setupSimulation() {
    // Clear the world
    Composite.clear(engine.world, true);

    // Reset variables
    nodes = [];
    edgeCount = 0;
    components = [];
    cycles = [];
    giantComponentSize = 0;
    giantComponentThreshold = false;
    highlightedCycle = null;

    // Define grid parameters
    const rows = 10;
    const cols = 10;
    const margin = 50;
    const availableWidth = render.options.width - 2 * margin;
    const availableHeight = render.options.height - 2 * margin;
    const xSpacing = cols > 1 ? availableWidth / (cols - 1) : 0;
    const ySpacing = rows > 1 ? availableHeight / (rows - 1) : 0;

    // Create nodes
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const label = index.toString().padStart(2, '0');
            const x = margin + col * xSpacing;
            const y = margin + row * ySpacing;

            // Create a circular body with a radius of 20
            const node = Bodies.circle(x, y, 20, {
                render: {
                    fillStyle: '#0077ff'
                }
            }) as Node;

            // Attach the label text and component ID as custom properties
            node.labelText = label;
            node.componentId = -1; // Initialize with no component
            node.highlighted = false; // Initialize not highlighted
            nodes.push(node);
        }
    }

    // Create boundaries
    const wallThickness = 50;
    const boundaries = [
        Bodies.rectangle(render.options.width / 2, -wallThickness / 2, render.options.width, wallThickness, {
            isStatic: true,
            render: { fillStyle: '#1a1a24' }
        }),
        Bodies.rectangle(render.options.width / 2, render.options.height + wallThickness / 2, render.options.width, wallThickness, {
            isStatic: true,
            render: { fillStyle: '#1a1a24' }
        }),
        Bodies.rectangle(-wallThickness / 2, render.options.height / 2, wallThickness, render.options.height, {
            isStatic: true,
            render: { fillStyle: '#1a1a24' }
        }),
        Bodies.rectangle(render.options.width + wallThickness / 2, render.options.height / 2, wallThickness, render.options.height, {
            isStatic: true,
            render: { fillStyle: '#1a1a24' }
        })
    ];

    // Add all elements to the world
    Composite.add(engine.world, [...nodes, ...boundaries]);

    // Add mouse control so nodes become draggable
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Create a graph instance for our nodes
    graph = new Graph(nodes.length);

    // Initialize components
    findComponents();
    
    // Set up stats panel
    updateStats();

    // Return the components
    return { nodes, graph };
}

/**
 * Attach a spring between two nodes specified by their indices,
 * and update the graph (undirected: add edges in both directions).
 * @param indexA - The index of the first node.
 * @param indexB - The index of the second node.
 */
function attachSpring(indexA: number, indexB: number) {
    if (
        indexA < 0 || indexA >= nodes.length ||
        indexB < 0 || indexB >= nodes.length ||
        indexA === indexB
    ) {
        console.error('Invalid node indices');
        return false;
    }
    
    const nodeA = nodes[indexA];
    const nodeB = nodes[indexB];

    // Check if connection already exists
    const existingConstraints = Composite.allConstraints(engine.world);
    for (const constraint of existingConstraints) {
        if (
            (constraint.bodyA === nodeA && constraint.bodyB === nodeB) ||
            (constraint.bodyA === nodeB && constraint.bodyB === nodeA)
        ) {
            console.log('Connection already exists');
            return false;
        }
    }

    // Use a constant spring length to pull nodes together
    // The value 60 is approximately 3x the node radius (20px)
    const constantLength = 60;

    // Create a spring with fixed length
    const spring = Constraint.create({
        bodyA: nodeA,
        bodyB: nodeB,
        length: constantLength,
        stiffness: 0.01, // Increased stiffness for stronger grouping
        damping: 0.1,    // Increased damping to reduce oscillation
        render: {
            strokeStyle: '#ffffff',
            lineWidth: 2
        }
    });
    
    Composite.add(engine.world, spring);

    // Update the graph as an undirected edge
    graph.addEdge(indexA, indexB);
    graph.addEdge(indexB, indexA);
    
    // Increment edge count
    edgeCount++;
    
    // Update components after adding edge
    findComponents();
    updateStats();
    
    return true;
}

/**
 * Add a random connection based on the current probability value
 */
function addRandomConnectionWithProbability() {
    // Add connection with probability p
    if (!nodes || nodes.length === 0) {
        console.error('No nodes available');
        return;
    }

    // For all possible pairs of nodes
    let connections = 0;
    const maxAttempts = 10; // Limit attempts to avoid infinite loops

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Pick a random pair
        const i = Math.floor(Math.random() * nodes.length);
        let j = Math.floor(Math.random() * nodes.length);

        // Make sure we don't connect a node to itself
        while (j === i) {
            j = Math.floor(Math.random() * nodes.length);
        }

        // Check if we should add this edge based on probability
        if (Math.random() < edgeProbability) {
            // If connection was successfully added, break
            if (attachSpring(i, j)) {
                connections++;
                break;
            }
        }
    }

    if (connections === 0) {
        console.log("No new connections made in this step");
    }
}

/**
 * Add a completely random connection (the original method)
 */
function addRandomConnection() {
    if (!nodes || nodes.length === 0) {
        console.error('No nodes available');
        return;
    }

    const i = Math.floor(Math.random() * nodes.length);
    let j = Math.floor(Math.random() * nodes.length);

    // Make sure we don't connect a node to itself
    while (j === i) {
        j = Math.floor(Math.random() * nodes.length);
    }

    attachSpring(i, j);
}

/**
 * Detect cycles in the graph and store them.
 * Returns an array of cycles, where each cycle is represented as an array of node indices.
 */
function detectCycles() {
    if (!graph) {
        console.error('Graph not initialized');
        return [];
    }

    // Reset any existing highlighted nodes
    nodes.forEach(node => {
        node.highlighted = false;
    });
    
    // Find all cycles in the graph
    cycles = graph.findCycles();
    console.log("Cycles detected:", cycles);
    return cycles;
}

/**
 * Highlight a random cycle in the visualization
 */
function highlightRandomCycle() {
    // Reset previous highlight
    if (highlightedCycle) {
        highlightedCycle.forEach(nodeIndex => {
            nodes[nodeIndex].highlighted = false;
        });
        highlightedCycle = null;
    }
    
    // If there are no cycles, show an alert
    if (cycles.length === 0) {
        alert("No cycles detected in the current graph. Add more connections to create cycles.");
        return;
    }
    
    // Pick a random cycle
    const randomIndex = Math.floor(Math.random() * cycles.length);
    highlightedCycle = cycles[randomIndex];
    
    // Highlight the nodes in the cycle
    highlightedCycle.forEach(nodeIndex => {
        nodes[nodeIndex].highlighted = true;
    });
    
    // Show cycle details
    showCycleDetails(demoElement, highlightedCycle);
}

// Set up event listeners for UI buttons
resetBtn.addEventListener('click', setupSimulation);

fullscreenBtn.addEventListener('click', () => toggleFullscreen(demoElement));

// Update connection button text and function
addConnectionBtn.textContent = "Add Connection (Manual)";
addConnectionBtn.addEventListener('click', addRandomConnection);

// Draw labels for each node after rendering the world
Events.on(render, 'afterRender', () => {
    const context = render.context;
    
    // First draw connections with component colors
    const constraints = Composite.allConstraints(engine.world);
    constraints.forEach(constraint => {
        if (constraint.bodyA && constraint.bodyB) {
            const bodyA = constraint.bodyA as Node;
            const bodyB = constraint.bodyB as Node;
            
            // If both bodies are part of the same component, color the constraint
            if (bodyA.componentId !== undefined && 
                bodyB.componentId !== undefined && 
                bodyA.componentId === bodyB.componentId &&
                bodyA.componentId >= 0) {
                
                const color = getComponentColor(
                    bodyA.componentId, 
                    components.length,
                    components,
                    giantComponentSize
                );
                
                // Check if this connection is part of the highlighted cycle
                const isHighlighted = highlightedCycle && 
                    highlightedCycle.includes(nodes.indexOf(bodyA)) && 
                    highlightedCycle.includes(nodes.indexOf(bodyB));
                
                const startPos = bodyA.position;
                const endPos = bodyB.position;
                
                context.beginPath();
                context.moveTo(startPos.x, startPos.y);
                context.lineTo(endPos.x, endPos.y);
                
                // If highlighted, draw a thicker, brighter line
                if (isHighlighted) {
                    context.strokeStyle = '#ffff00';
                    context.lineWidth = 4;
                } else {
                    context.strokeStyle = color;
                    context.lineWidth = 2;
                }
                
                context.stroke();
            }
        }
    });
    
    // Draw nodes with component colors
    nodes.forEach((node) => {
        // Update node color based on component
        if (node.componentId >= 0) {
            const color = getComponentColor(
                node.componentId, 
                components.length,
                components,
                giantComponentSize
            );
            node.render.fillStyle = node.highlighted ? '#ffff00' : color;
            
            // If highlighted, add a glowing effect
            if (node.highlighted) {
                context.beginPath();
                context.arc(node.position.x, node.position.y, 25, 0, Math.PI * 2);
                context.fillStyle = 'rgba(255, 255, 0, 0.3)';
                context.fill();
            }
        } else {
            node.render.fillStyle = '#0077ff'; // Default color
        }
        
        // Draw the node label
        context.font = '14px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(node.labelText, node.position.x, node.position.y);
    });
});

// Initialize the simulation
setupSimulation();

// Run the renderer and engine
Render.run(render);
Runner.run(runner, engine);

// Export functions for external use (e.g., console debugging)
(window as any).attachSpring = attachSpring;
(window as any).findComponents = findComponents;
(window as any).addRandomConnection = addRandomConnection;
(window as any).addRandomConnectionWithProbability = addRandomConnectionWithProbability;
(window as any).detectCycles = detectCycles;
(window as any).highlightRandomCycle = highlightRandomCycle;