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
import {Graph} from './graph';
import * as MatterTools from 'matter-tools';
import {initDOM} from './utils'
initDOM({
    toolbar: {
        title: 'yay',
        reset: true,
        source: true,
        inspector: true,
        tools: true,
        fullscreen: true,
    },
    tools: {
        inspector: true,
        gui: true
    },
    inline: false,
    preventZoom: true,
    resetOnOrientation: true,
    routing: true,
})

type Node = Matter.Body & { labelText: string };

const engine = Engine.create();
engine.gravity.y = 0;

const render = Render.create({
    element: document.querySelector('.yay'),
    engine: engine,
    options: {
        
    }
});
if (!render) throw new Error('Render is not defined');

const nodes: Node[] = [];
const rows = 10;
const cols = 10;
const margin = 50;
const availableWidth = render.options.width - 2 * margin;
const availableHeight = render.options.height - 2 * margin;
const xSpacing = cols > 1 ? availableWidth / (cols - 1) : 0;
const ySpacing = rows > 1 ? availableHeight / (rows - 1) : 0;

for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const label = index.toString().padStart(2, '0');
        const x = margin + col * xSpacing;
        const y = margin + row * ySpacing;

        // Create a circular body with a radius of 20.
        const node = Bodies.circle(x, y, 20, {
            render: {
                fillStyle: '#0077ff'
            }
        }) as Node;
        // Attach the label text as a custom property.
        node.labelText = label;
        nodes.push(node);
    }
}

const wallThickness = 50;

// Add boundaries to the world.
Composite.add(engine.world, [
    Bodies.rectangle(render.options.width / 2, -wallThickness / 2, render.options.width, wallThickness, { isStatic: true }),
    Bodies.rectangle(render.options.width / 2, render.options.height + wallThickness / 2, render.options.width, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness / 2, render.options.height / 2, wallThickness, render.options.height, { isStatic: true }),
    Bodies.rectangle(render.options.width + wallThickness / 2, render.options.height / 2, wallThickness, render.options.height, { isStatic: true })
]);

// Add all the nodes to the world.
Composite.add(engine.world, nodes);

// Create and add a static ground so the scene has a boundary.
const ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });
Composite.add(engine.world, ground);

// Add mouse control so nodes become draggable.
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



// Create a graph instance for our nodes.
const graph = new Graph(nodes.length);

/**
 * Attach a spring between two nodes specified by their indices,
 * and update the graph (undirected: add edges in both directions).
 * @param indexA - The index of the first node.
 * @param indexB - The index of the second node.
 */
function attachSpring(indexA: number, indexB: number) {
    if (
        indexA < 0 || indexA >= nodes.length ||
        indexB < 0 || indexB >= nodes.length
    ) {
        console.error('Invalid node index');
        return;
    }
    const nodeA = nodes[indexA];
    const nodeB = nodes[indexB];

    // Compute the desired spring rest length from xSpacing and ySpacing.
    const restLength = Math.sqrt(xSpacing * xSpacing + ySpacing * ySpacing);

    const spring = Constraint.create({
        bodyA: nodeA,
        bodyB: nodeB,
        length: restLength,
        stiffness: 0.003,
        damping: 0.005,
        render: {
            strokeStyle: '#ffffff',
            lineWidth: 2
        }
    });
    Composite.add(engine.world, spring);

    // Update the graph as an undirected edge.
    graph.addEdge(indexA, indexB);
    graph.addEdge(indexB, indexA);
}



/**
 * Detect cycles in the graph and log them.
 * Returns an array of cycles, where each cycle is represented as an array of node indices.
 */
function detectCycles() {
    const cycles = graph.findCycles();
    console.log("Cycles detected:", cycles);
    return cycles;
}



// Run the renderer.
Render.run(render);

// Create and run the engine runner.
const runner = Runner.create();
Runner.run(runner, engine);

// Draw labels for each node after rendering the world.
Events.on(render, 'afterRender', () => {
    const context = render.context;
    context.font = '14px Arial';
    context.fillStyle = 'white';
    nodes.forEach((node) => {
        // Adjust the text position so it centers on the node.
        context.fillText(node.labelText, node.position.x - 10, node.position.y + 5);
    });
});

// (Optional) Call detectCycles to see the cycles logged in the console.
detectCycles();

function step(){
    const j = Math.floor(Math.random() * nodes.length);
    const i = Math.floor(Math.random() * nodes.length);

    attachSpring(i, j);
    detectCycles();
}

// document.querySelector('#stepBtn').addEventListener('click', step);

