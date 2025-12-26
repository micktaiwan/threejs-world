import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Controls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new PointerLockControls(camera, domElement);

        this.keys = { z: false, q: false, s: false, d: false, e: false, a: false };

        // Movement with inertia
        this.velocity = new THREE.Vector3();
        this.acceleration = 50;
        this.friction = 0.95;
        this.maxSpeed = 15;
        this.verticalSpeed = 8;

        this.raycaster = new THREE.Raycaster();
        this.screenCenter = new THREE.Vector2(0, 0);

        this.onClickCallback = null;

        this.setupUI();
        this.setupKeyboard();
        this.setupClick();
    }

    setupUI() {
        this.overlay = document.getElementById('overlay');
        this.crosshair = document.getElementById('crosshair');
        this.stats = document.getElementById('stats');

        this.overlay.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('lock', () => {
            this.overlay.classList.add('hidden');
            this.crosshair.classList.remove('hidden');
            if (this.stats) this.stats.classList.remove('hidden');
        });

        this.controls.addEventListener('unlock', () => {
            this.overlay.classList.remove('hidden');
            this.crosshair.classList.add('hidden');
            if (this.stats) this.stats.classList.add('hidden');
        });
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            switch (key) {
                case 'z': case 'w': this.keys.z = true; break;
                case 'q': this.keys.q = true; break;
                case 's': this.keys.s = true; break;
                case 'd': this.keys.d = true; break;
                case 'e': this.keys.e = true; break;
                case 'a': this.keys.a = true; break;
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            switch (key) {
                case 'z': case 'w': this.keys.z = false; break;
                case 'q': this.keys.q = false; break;
                case 's': this.keys.s = false; break;
                case 'd': this.keys.d = false; break;
                case 'e': this.keys.e = false; break;
                case 'a': this.keys.a = false; break;
            }
        });
    }

    setupClick() {
        document.addEventListener('click', () => {
            if (!this.isLocked()) return;
            if (this.onClickCallback) {
                this.onClickCallback();
            }
        });
    }

    onClick(callback) {
        this.onClickCallback = callback;
    }

    isLocked() {
        return this.controls.isLocked;
    }

    getDirection() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir;
    }

    raycast(meshes) {
        this.raycaster.setFromCamera(this.screenCenter, this.camera);
        return this.raycaster.intersectObjects(meshes);
    }

    update(deltaTime) {
        if (!this.isLocked()) return;

        // Calculate input direction
        const inputZ = Number(this.keys.z) - Number(this.keys.s);
        const inputX = Number(this.keys.d) - Number(this.keys.q);

        // Apply acceleration when keys pressed
        if (inputZ !== 0 || inputX !== 0) {
            this.velocity.z += inputZ * this.acceleration * deltaTime;
            this.velocity.x += inputX * this.acceleration * deltaTime;
        }

        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.z *= this.friction;

        // Clamp speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.z = (this.velocity.z / speed) * this.maxSpeed;
        }

        // Apply movement
        if (Math.abs(this.velocity.z) > 0.01) {
            this.controls.moveForward(this.velocity.z * deltaTime);
        }
        if (Math.abs(this.velocity.x) > 0.01) {
            this.controls.moveRight(this.velocity.x * deltaTime);
        }

        // Vertical movement (E/A) - with inertia too
        if (this.keys.e) {
            this.velocity.y = this.verticalSpeed;
        } else if (this.keys.a) {
            this.velocity.y = -this.verticalSpeed;
        } else {
            this.velocity.y *= this.friction;
        }

        if (Math.abs(this.velocity.y) > 0.01) {
            this.camera.position.y += this.velocity.y * deltaTime;
        }

        // Empêcher la caméra de descendre sous le sol
        const minHeight = 0.5; // Hauteur minimale (niveau des yeux)
        if (this.camera.position.y < minHeight) {
            this.camera.position.y = minHeight;
            this.velocity.y = 0;
        }
    }
}
