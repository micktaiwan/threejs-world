import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { soundManager } from './SoundManager.js';

export class GameObject {
    constructor(world, scene) {
        this.world = world;
        this.scene = scene;
        this.mesh = null;
        this.body = null;
        this.light = null;
        this.pushForce = 10;
    }

    create(position) {
        if (this.mesh) {
            this.scene.add(this.mesh);
            // Ajouter une lumière à l'objet pour qu'il soit visible même hors de la salle
            this.light = new THREE.PointLight(this.lightColor || 0xffffff, 1, 8);
            this.mesh.add(this.light);
        }
        if (this.body) {
            this.body.position.copy(position);
            this.world.addBody(this.body);
            this.setupCollisionSound();
        }
    }

    setupCollisionSound() {
        this.body.addEventListener('collide', (event) => {
            // Calculer l'intensité basée sur la vitesse de l'impact
            const impact = event.contact.getImpactVelocityAlongNormal();
            const intensity = Math.abs(impact);

            // Ne jouer un son que si l'impact est assez fort
            if (intensity > 1) {
                soundManager.playCollision(intensity);
            }
        });
    }

    update() {
        if (this.mesh && this.body) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }

    push(direction) {
        if (this.body) {
            soundManager.playPush();
            const force = new CANNON.Vec3(
                direction.x * this.pushForce,
                direction.y * this.pushForce + 5,
                direction.z * this.pushForce
            );
            this.body.applyImpulse(force);
        }
    }

    getMesh() {
        return this.mesh;
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
        if (this.body) {
            this.world.removeBody(this.body);
            this.body = null;
        }
        if (this.light) {
            this.light.dispose();
            this.light = null;
        }
    }
}
