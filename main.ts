const sceneConfig = {
    active: false,
    visible: false,
    key: 'Main',
}
export class Main extends Phaser.Scene {
    
    constructor() {
        super(sceneConfig);
    }
    graphics!: Phaser.GameObjects.Graphics; 
    w!: number;
    h!: number;
    giantDetected: boolean = false;
    toggleDebug!: Phaser.Input.Keyboard.Key;
    canDrag!: number;
    init() {
        this.graphics = this.add.graphics();
        this.matter.world.setBounds();
        this.w = this.game.config.width as number
        this.h = this.game.config.height as number
        this.matter.world.drawDebug = false;
        this.toggleDebug = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    }
    // makeNode() {
    //     // this is a node
    //     // store this in DS for SCC detection
    //     // write a label on the node
    //     let node = this.matter.add.circle(this.w * 0.25, this.h * 0.25, 0, { isStatic: true })
    // }
    addEdge(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType){
        // this is the edge
        // but we probably need to store this in a DS for the SCC detection? 
        let spring = this.matter.add.spring(bodyA, bodyB, 0, 0.03);
    }
    createNodes() {
        const rows = 10;
        const cols = 10;
        const margin = 50;
        const availableWidth = this.w - 2 * margin;
        const availableHeight = this.h - 2 * margin;
        const xSpacing = cols > 1 ? availableWidth / (cols - 1) : 0;
        const ySpacing = rows > 1 ? availableHeight / (rows - 1) : 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                const labelText = index.toString().padStart(2, '0');
                const x = margin + col * xSpacing;
                const y = margin + row * ySpacing;

                // Create a container at (x, y)
                let container = this.add.container(x, y);

                // Create a circle graphic centered at (0,0)
                let circle = this.add.circle(0, 0, 20, 0x0077ff);

                // Create a text object centered at (0,0)
                let text = this.add.text(0, 0, labelText, {
                    fontSize: '14px',
                    color: '#ffffff'
                }).setOrigin(0.5);

                container.add([circle, text]);

                // Add the container to the Matter world with a circular body.
                // We keep a reference to the returned GameObject.
                let nodeGameObject = this.matter.add.gameObject(container, {
                    shape: { type: 'circle', radius: 20 }
                }) as Phaser.Physics.Matter.Sprite;
                // console.log( nodeGameObject);

                // Set the node's body to be part of our draggable collision group.

                //@ts-ignore
                nodeGameObject.body!.collisionFilter.group = this.canDrag;
            }
        }
    }

    create() {
        // Create interactive texts for stepping or auto-running edges.
        this.add.text(this.w, 0, "step", {
            fontSize: '32px',
        }).setOrigin(1, 0).setPadding(10)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
              // Step functionality: add an edge, update DS, etc.
          });

        this.add.text(this.w, 30, "auto run", {
            fontSize: '32px',
        }).setOrigin(1, 0).setPadding(10)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
              // Auto-run functionality: add edges until the giant component is detected.
          });

        // Create one collision group that will be used for all draggable objects.
        this.canDrag = this.matter.world.nextGroup();

        // Enable dragging with a mouse spring. This makes objects in the canDrag group draggable.
        this.matter.add.mouseSpring({ collisionFilter: { group: this.canDrag } });
        console.log(this.matter.add.mouseSpring)
        // Create our 100 nodes.
        this.createNodes();
    }
    
    
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.toggleDebug)) {
            if (this.matter.world.drawDebug) {
              this.matter.world.drawDebug = false;
              this.matter.world.debugGraphic.clear();
            }
            else {
              this.matter.world.drawDebug = true;
            }
          }

    }
}