export class Main extends Phaser.Scene {
    constructor() {
        super('intro');
    }

    drawTrajectory() {

        this.graphics.clear();
        //credit: adam smith 
        let hWorld = new Phaser.Physics.Matter.World(this, this.matter.config);
        let hFactory = new Phaser.Physics.Matter.Factory(hWorld);
        let hDot = hFactory.circle(this.w * 0.25, this.h * 0.25, 0, { isStatic: true })
        let hBall = hFactory.circle(this.ball.position.x, this.ball.position.y, 32);
        let hSpring = hFactory.spring(hBall, hDot, this.spring.length, this.spring.stiffness);
        const step = 1000 / 60;
        hWorld.update(0, step);

        hWorld.removeConstraint(hSpring);

        if (Math.abs(hBall.position.y - this.ball.position.y) > 1) {
            for (let t = 0; t < 1000; t += step) {
                let { x, y } = hBall.position;
                this.graphics.fillCircle(x, y, 3);
                hWorld.update(t, step);
            }
        }

    }

    checkGameOver() {
        //see if the highest block is higher than half the screen
        let blocks_highest = this.blocks.reduce((acc, cur) => {
            return acc < cur.position.y ? acc : cur.position.y
        }, this.h)
        
        this.gameOver = blocks_highest > (this.h * 0.5)
        if (this.gameOver) {
            this.cameras.main.fade(1000,0,0,0)
            this.time.delayedCall(2000, () => {
                this.scene.start('zones')
            })
        } else {
            //check if the mouseSpring has been released
            const d = this.matter.world.localWorld.constraints.filter((c) => {
                return c.label === "Pointer Constraint"
            })
            if(!d.length){
                this.time.delayedCall(10000, () => {
                    this.cameras.main.fade(1000,0,0,0)
                    this.scene.restart()
                })
            }
        }

    }
    checkFired() {
        //release the spring if the ball is far enough away
        let disp = Phaser.Math.Distance.Between(this.ball.position.x, this.ball.position.y, this.dot.position.x, this.dot.position.y);
        if (disp > this.ball.circleRadius && !this.input.activePointer.isDown) {
            this.matter.world.removeConstraint(this.spring)
            this.predict = false
            this.graphics.clear()
            //remove the mouse spring
            const d = this.matter.world.localWorld.constraints.filter((c) => {
                return c.label === "Pointer Constraint"
            })
            d.forEach((constraint) => {
                this.matter.world.removeConstraint(constraint)
            })
            // this.matter.world.remove(this.matter.world.constraints[0])
        }
        if (this.predict) {
            this.drawTrajectory()
        }
    }

    create() {
        this.graphics = this.add.graphics();
        this.matter.world.setBounds();
        this.w = this.game.config.width
        this.h = this.game.config.height

        //the anchor for the spring
        this.dot = this.matter.add.circle(this.w * 0.25, this.h * 0.25, 0, { isStatic: true })
        //turn off collision for the anchor
        this.dot.collisionFilter = {
            category: 0x0000,
            mask: 0x0000
        };
        //the ball and spring
        const canDrag = this.matter.world.nextGroup();
        this.ball = this.matter.add.circle(this.w * 0.25, this.h * 0.25, 32, { 
            collisionFilter: { group: canDrag },
            render: {
                fillColor: 0xffffff,
                fillOpacity: 1,
            }
        });
        this.spring = this.matter.add.spring(this.ball, this.dot, 0, 0.03);
        this.spring.render.visible = false;
        this.matter.add.mouseSpring
        this.matter.add.mouseSpring({ collisionFilter: { group: canDrag } });
        this.blocks = []
        for (let i = 0; i < 10; i++) {
            let b = this.matter.add.rectangle(this.w * 0.75, this.h * i / 10, 100, this.h * 0.09, {

                render: {
                    fillColor: 0xaaaaaa,
                    fillOpacity: 1,
                }
            })
            this.blocks.push(b)
        }
        // console.log(this.matter.world.localWorld)
        this.predict = true
        this.gameOver = false
        this.add.text(this.w, 0, "restart", {
            fontSize: '32px',
        }).setOrigin(1, 0).setPadding(10).setInteractive({useHandCursor: true}).on('pointerdown', () => {
            this.scene.restart()
        })
        this.add.text(this.w, 30, "zones", {
            fontSize: '32px',
        }).setOrigin(1, 0).setPadding(10).setInteractive({useHandCursor: true}).on('pointerdown', () => {
            this.scene.start('zones')
        })
    }
    update() {
        if (!this.gameOver && !this.predict) {
            this.checkGameOver()
        }
        if (this.predict) {
            this.checkFired()
        }


    }
}