import { World } from './World.js';
import { Controls } from './Controls.js';
import { Cube } from './Cube.js';
import { Sphere } from './Sphere.js';
import { Missile } from './Missile.js';

// Create world
let world = new World();

// Create controls
let controls = new Controls(world.camera, document.body);

// Missiles actifs
let missiles = [];

// UI elements
const statsElement = document.getElementById('stats');

// Cube colors
const cubeColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181];

// Fonction pour créer les objets
function createObjects() {
    // Create cubes
    for (let i = 0; i < 5; i++) {
        const cube = new Cube(world.physicsWorld, world.scene, cubeColors[i]);
        cube.create({
            x: (Math.random() - 0.5) * 8,
            y: 3 + i * 2,
            z: (Math.random() - 0.5) * 8
        });
        world.addObject(cube);
    }

    // Create spheres
    for (let i = 0; i < 3; i++) {
        const sphere = new Sphere(world.physicsWorld, world.scene);
        sphere.create({
            x: (Math.random() - 0.5) * 8,
            y: 5 + i * 2,
            z: (Math.random() - 0.5) * 8
        });
        world.addObject(sphere);
    }
}

// Fonction pour reset le monde
function resetWorld() {
    // Détruire tous les missiles
    missiles.forEach(m => m.destroy());
    missiles = [];

    // Détruire tous les objets
    world.objects.forEach(obj => obj.destroy());
    world.objects = [];

    // Recréer les objets
    createObjects();
}

// Créer les objets initiaux
createObjects();

// Raccourci R pour reset
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r' && controls.isLocked()) {
        resetWorld();
    }
});

// Handle click - launch missile
controls.onClick(() => {
    const cameraDirection = controls.getDirection();
    const cameraPosition = world.camera.position.clone();

    // Raycast pour trouver la vraie cible (ce que le joueur vise)
    const targets = world.getAllRaycastTargets();
    const intersects = controls.raycast(targets);

    let targetPoint;
    if (intersects.length > 0) {
        // Viser le point d'impact réel
        targetPoint = intersects[0].point.clone();
    } else {
        // Pas de cible → viser loin
        targetPoint = cameraPosition.clone().add(cameraDirection.clone().multiplyScalar(100));
    }

    // Position de départ du missile : plus bas et légèrement devant
    const missilePosition = cameraPosition.clone();
    missilePosition.y -= 0.5;  // Plus bas (niveau torse)
    missilePosition.add(cameraDirection.clone().multiplyScalar(0.8));  // Devant

    // Nouvelle direction : du missile vers la cible
    const missileDirection = targetPoint.clone().sub(missilePosition).normalize();

    const missile = new Missile(
        world.physicsWorld,
        world.scene,
        missilePosition,
        missileDirection,
        targetPoint
    );

    missiles.push(missile);
});

// Update stats UI
function updateStats() {
    if (statsElement) {
        const objectCount = world.objects.length;
        const missileCount = missiles.filter(m => m.isActive).length;
        statsElement.textContent = `Objets: ${objectCount} | Missiles: ${missileCount}`;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = world.update();
    controls.update(deltaTime);

    // Update missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        missile.update(deltaTime);

        // Supprimer les missiles une fois l'explosion terminée
        if (missile.isFullyDone()) {
            missile.destroy();
            missiles.splice(i, 1);
        }
    }

    updateStats();
    world.render();
}

animate();
