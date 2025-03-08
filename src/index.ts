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
    showCycleDetails,
    stopAutoRun
} from './utils';
import { createComponentDistributionChart } from './component-distribution';

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
let highlightedCycle: number[] | null = null; // Currently highlighted cycle
let statsPanel: HTMLElement;
let prevGiantComponentThresholdReached = false; // Track previous threshold state

/**
 * Update stats display and UI
 */
function updateStats() {
    if (!statsPanel) {
        statsPanel = createStatsPanel(demoElement);
    }
    
    // Check if the giant component threshold has been crossed
    const isAboveThreshold = graph.isAboveGiantComponentThreshold;
    
    // Show notification if giant component threshold just reached
    if (!prevGiantComponentThresholdReached && isAboveThreshold) {
        showGiantComponentNotification(demoElement);
    }
    
    // Update previous threshold state
    prevGiantComponentThresholdReached = isAboveThreshold;
    
    // Update component distribution chart
    createComponentDistributionChart(demoElement, graph);
    
    // Update stats display
    updateStatsPanel(
        statsPanel,
        {
            graph,
            nodes,
            onStepClick: () => addRandomConnection(),
            onAutoClick: () => {},
            onHighlightCycles: () => highlightRandomCycle()
        }
    );
}

/**
 * Assign component IDs to nodes based on graph analysis
 */
function updateNodeComponentAssignments() {
    // Get the current component analysis
    const componentAnalysis = graph.componentAnalysis;
    
    // Create a mapping from node index to component ID
    const componentAssignment = new Array(nodes.length).fill(-1);
    
    // Assign each node to its component
    componentAnalysis.forEach((analysis, index) => {
        analysis.component.forEach(nodeIndex => {
            componentAssignment[nodeIndex] = index;
        });
    });
    
    // Update the component IDs in the node objects
    nodes.forEach((node, index) => {
        node.componentId = componentAssignment[index];
    });
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
    
    // Find a cycle to highlight using the graph class
    const cycle = graph.findCycleToHighlight();
    
    // If no cycle was found
    if (!cycle) {
        alert("No cycles detected in the current graph. Add more connections to create cycles.");
        return;
    }
    
    // Set the highlighted cycle
    highlightedCycle = cycle;
    
    // Highlight the nodes in the cycle
    highlightedCycle.forEach(nodeIndex => {
        nodes[nodeIndex].highlighted = true;
    });
    
    // Show cycle details
    showCycleDetails(demoElement, highlightedCycle);
}

/**
 * Set up the simulation
 */
function setupSimulation() {
    // Clear the world
    Composite.clear(engine.world, true);

    // Reset variables
    nodes = [];
    highlightedCycle = null;
    prevGiantComponentThresholdReached = false;

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
    
    // Update node component assignments
    updateNodeComponentAssignments();
    
    // Set up stats panel
    updateStats();

    return { nodes, graph };
}

/**
 * Generate an entire Erdős-Rényi G(n,p) random graph with given probability p
 * @param probability - The probability of adding each possible edge
 */
function generateRandomGraph(probability: number) {
    // Reset the simulation first
    setupSimulation();
    
    const n = nodes.length;
    
    // For each pair of nodes, add an edge with probability p
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.random() < probability) {
                attachSpring(i, j);
            }
        }
    }
    
    // Update the components and stats after all edges are added
    updateNodeComponentAssignments();
    updateStats();
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
    
    // Update node component assignments
    updateNodeComponentAssignments();
    
    // Update stats
    updateStats();
    
    return true;
}

/**
 * Add a random connection
 */
function addRandomConnection() {
    if (!nodes || nodes.length === 0) {
        console.error('No nodes available');
        return;
    }

    // Pick a random pair of nodes
    const i = Math.floor(Math.random() * nodes.length);
    let j = Math.floor(Math.random() * nodes.length);

    // Make sure we don't connect a node to itself
    while (j === i) {
        j = Math.floor(Math.random() * nodes.length);
    }

    attachSpring(i, j);
}

// Set up event listeners for UI buttons
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
resetBtn.addEventListener('click', setupSimulation);

const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
fullscreenBtn.addEventListener('click', () => toggleFullscreen(demoElement));

// Update connection button text and function
const addConnectionBtn = document.getElementById('add-connection-btn') as HTMLButtonElement;
addConnectionBtn.textContent = "Add Random Connection";
addConnectionBtn.addEventListener('click', addRandomConnection);

// Add a new button for generating a random graph
const generateBtn = document.createElement('button');
generateBtn.id = 'generate-graph-btn';
generateBtn.className = 'action-button';
generateBtn.textContent = "Generate G(n,p) Random Graph";
generateBtn.style.marginLeft = '10px';
generateBtn.addEventListener('click', () => {
    const probability = parseFloat(prompt("Enter probability p (0-1):", "0.1") || "0.1");
    if (probability >= 0 && probability <= 1) {
        generateRandomGraph(probability);
    } else {
        alert("Please enter a valid probability between 0 and 1");
    }
});
document.querySelector('.action-buttons')?.appendChild(generateBtn);

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
                    graph
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
                graph
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
(window as any).addRandomConnection = addRandomConnection;
(window as any).highlightRandomCycle = highlightRandomCycle;
(window as any).generateRandomGraph = generateRandomGraph;
(window as any).graph = graph;