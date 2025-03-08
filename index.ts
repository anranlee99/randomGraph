import { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint } from 'matter-js';
type Node = Matter.Body & { labelText: string };
const engine = Engine.create();
engine.gravity.y = 0;

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: false,
        
    }
});
if (!render) throw new Error('Render is not defined');

const nodes = [];
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

        // Create a circular body with a radius of 20 and a custom fill style.
        const node = Bodies.circle(x, y, 20, {
            render: {
                fillStyle: '#0077ff'
            }
        }) as Node;
        // Attach the label text as a custom property on the body.
        node.labelText = label;
        nodes.push(node);
    }
}
const wallThickness = 50;


// Add the boundaries to the world.
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
        render: {
            visible: false
        }
    }
});
Composite.add(engine.world, mouseConstraint);
render.mouse = mouse;

// run the renderer
Render.run(render);

// create runner
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
