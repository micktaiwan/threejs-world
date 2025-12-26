import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameObject } from './GameObject.js';

export class Cube extends GameObject {
    constructor(world, scene, color = 0xff6b6b) {
        super(world, scene);
        this.pushForce = 8;
        this.color = color;
        this.lightColor = color; // Lumière de même couleur que l'objet
        this.createMesh();
        this.createBody();
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
    }

    createBody() {
        const material = new CANNON.Material('cube');
        material.restitution = 0.3;

        this.body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
            material: material
        });
    }
}
