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

type Node = Matter.Body & { 
    labelText: string;
    componentId: number; // Track which component the node belongs to
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
let edgeProbability = 0.05; // Initial probability for Erdős-Rényi model
let edgeCount = 0;
let maxEdges = 0; // Maximum possible edges in the graph
let giantComponentSize = 0; // Size of the largest component
let giantComponentThreshold = false; // Whether we've crossed the threshold for giant component

// Set up UI elements
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const inspectBtn = document.getElementById('inspect-btn') as HTMLButtonElement;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const addConnectionBtn = document.getElementById('add-connection-btn') as HTMLButtonElement;
const inspectorContainer = document.querySelector('.ins-container') as HTMLElement;

// Create a stats panel
function createStatsPanel() {
    // Remove existing stats panel if it exists
    const existingPanel = document.getElementById('stats-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    const statsPanel = document.createElement('div');
    statsPanel.id = 'stats-panel';
    statsPanel.style.position = 'fixed';
    statsPanel.style.top = '60px';
    statsPanel.style.right = '20px';
    statsPanel.style.backgroundColor = 'rgba(20, 21, 31, 0.8)';
    statsPanel.style.padding = '15px';
    statsPanel.style.borderRadius = '5px';
    statsPanel.style.color = 'white';
    statsPanel.style.fontFamily = 'Arial, sans-serif';
    statsPanel.style.fontSize = '14px';
    statsPanel.style.zIndex = '100';
    statsPanel.style.width = '250px';
    statsPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';

    demoElement.appendChild(statsPanel);
    return statsPanel;
}

// Update stats display
function updateStats() {
    const statsPanel = document.getElementById('stats-panel') || createStatsPanel();
    
    // Calculate n(n-1)/2 which is the max possible edges in an undirected graph
    const n = nodes.length;
    maxEdges = (n * (n - 1)) / 2;
    
    // Theoretical threshold for giant component in Erdős-Rényi model: p = 1/n
    const thresholdP = 1 / n;
    const currentP = edgeCount / maxEdges;
    
    // Check if we've crossed the threshold
    giantComponentThreshold = currentP >= thresholdP;
    
    // Update stats display
    statsPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Random Graph Stats</h3>
        <div style="margin-bottom: 15px;">
            <div><strong>Nodes:</strong> ${n}</div>
            <div><strong>Edges:</strong> ${edgeCount} / ${maxEdges}</div>
            <div><strong>Edge Probability (p):</strong> ${currentP.toFixed(4)}</div>
            <div><strong>Threshold (1/n):</strong> ${thresholdP.toFixed(4)}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div><strong>Components:</strong> ${components.length}</div>
            <div><strong>Largest Component:</strong> ${giantComponentSize} nodes</div>
            <div><strong>Giant Component:</strong> ${giantComponentThreshold ? 'YES ✓' : 'NO ✗'}</div>
        </div>
        <div style="margin-bottom: 10px; border-top: 1px solid #555; padding-top: 10px;">
            <label for="probability-slider" style="display:block; margin-bottom: 5px;">Edge Probability: ${edgeProbability}</label>
            <input type="range" id="probability-slider" min="0.01" max="1" step="0.01" value="${edgeProbability}" style="width: 100%">
        </div>
        <button id="step-btn" style="margin-right: 5px; padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">Step</button>
        <button id="auto-btn" style="padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">Auto</button>
    `;

    // Add event listeners for the new controls
    const slider = document.getElementById('probability-slider') as HTMLInputElement;
    const stepBtn = document.getElementById('step-btn') as HTMLButtonElement;
    const autoBtn = document.getElementById('auto-btn') as HTMLButtonElement;

    if (slider) {
        slider.addEventListener('input', (e) => {
            edgeProbability = parseFloat((e.target as HTMLInputElement).value);
            updateStats();
        });
    }

    if (stepBtn) {
        stepBtn.addEventListener('click', () => addRandomConnectionWithProbability());
    }

    if (autoBtn) {
        let autoRunning = false;
        let intervalId: number | null = null;

        autoBtn.addEventListener('click', () => {
            if (autoRunning) {
                if (intervalId !== null) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                autoBtn.textContent = 'Auto';
                autoRunning = false;
            } else {
                intervalId = window.setInterval(() => {
                    addRandomConnectionWithProbability();
                }, 200);
                autoBtn.textContent = 'Stop';
                autoRunning = true;
            }
        });
    }
}

// Find connected components in the graph
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

// Color scheme for components - using HSL for better distribution
function getComponentColor(componentId: number, totalComponents: number) {
    // Use HSL color model to get evenly distributed colors
    const hue = componentId * (360 / (Math.max(totalComponents, 1)));
    
    // If this is the giant component (largest component), make it stand out
    if (components[componentId] && components[componentId].length === giantComponentSize && giantComponentSize > 3) {
        return `hsl(${hue}, 100%, 50%)`;
    }
    
    return `hsl(${hue}, 70%, 60%)`;
}

// Set up the simulation
function setupSimulation() {
    // Clear the world
    Composite.clear(engine.world, true);

    // Reset variables
    nodes = [];
    edgeCount = 0;
    components = [];
    giantComponentSize = 0;
    giantComponentThreshold = false;

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
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const fullscreenElement =
        document.fullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).webkitFullscreenElement;

    if (!fullscreenElement) {
        if (demoElement.requestFullscreen) {
            demoElement.requestFullscreen();
        } else if ((demoElement as any).mozRequestFullScreen) {
            (demoElement as any).mozRequestFullScreen();
        } else if ((demoElement as any).webkitRequestFullscreen) {
            //@ts-ignore
            (demoElement as any).webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        document.body.classList.add('matter-is-fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        }
        document.body.classList.remove('matter-is-fullscreen');
    }
}

// Set up event listeners for UI buttons
resetBtn.addEventListener('click', setupSimulation);

inspectBtn.addEventListener('click', () => {
    demoElement.classList.toggle('matter-inspect-active');
});

fullscreenBtn.addEventListener('click', toggleFullscreen);

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
                
                const color = getComponentColor(bodyA.componentId, components.length);
                
                const startPos = bodyA.position;
                const endPos = bodyB.position;
                
                context.beginPath();
                context.moveTo(startPos.x, startPos.y);
                context.lineTo(endPos.x, endPos.y);
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
            }
        }
    });
    
    // Draw nodes with component colors
    nodes.forEach((node) => {
        // Update node color based on component
        if (node.componentId >= 0) {
            const color = getComponentColor(node.componentId, components.length);
            node.render.fillStyle = color;
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