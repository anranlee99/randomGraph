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

type Node = Matter.Body & { labelText: string };

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

// Set up UI elements
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const inspectBtn = document.getElementById('inspect-btn') as HTMLButtonElement;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const addConnectionBtn = document.getElementById('add-connection-btn') as HTMLButtonElement;
const inspectorContainer = document.querySelector('.ins-container') as HTMLElement;

// Set up the simulation
function setupSimulation() {
    // Clear the world
    Composite.clear(engine.world, true);

    // Reset variables
    nodes = [];

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

            // Attach the label text as a custom property
            node.labelText = label;
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
        return;
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
            return;
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
}

/**
 * Detect cycles in the graph and log them.
 * Returns an array of cycles, where each cycle is represented as an array of node indices.
 */
function detectCycles() {
    if (!graph) {
        console.error('Graph not initialized');
        return [];
    }

    const cycles = graph.findCycles();
    console.log("Cycles detected:", cycles);
    return cycles;
}

/**
 * Add a random connection between nodes
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
    const cycles = detectCycles();

    // Highlight cycles if found (optional enhancement)
    if (cycles.length > 0) {
        console.log(`Found ${cycles.length} cycles!`);
        // You could add visual feedback here
    }
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

addConnectionBtn.addEventListener('click', addRandomConnection);

// Draw labels for each node after rendering the world
Events.on(render, 'afterRender', () => {
    const context = render.context;
    context.font = '14px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    nodes.forEach((node) => {
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
(window as any).detectCycles = detectCycles;
(window as any).addRandomConnection = addRandomConnection;