import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameObject } from './GameObject.js';

export class Sphere extends GameObject {
    constructor(world, scene, color = null) {
        super(world, scene);
        this.pushForce = 12;
        this.color = color || Math.random() * 0xffffff;
        this.lightColor = this.color; // Lumière de même couleur que l'objet
        this.createMesh();
        this.createBody();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            metalness: 0.6,
            roughness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
    }

    createBody() {
        const material = new CANNON.Material('sphere');
        material.restitution = 0.8;
        material.friction = 0.5;

        this.body = new CANNON.Body({
            mass: 0.5,
            shape: new CANNON.Sphere(0.5),
            material: material,
            linearDamping: 0.3,
            angularDamping: 0.3
        });
    }
}
