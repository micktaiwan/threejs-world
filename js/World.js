import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createTree } from './Tree.js';

export class World {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.physicsWorld = null;
        this.objects = [];
        this.clock = new THREE.Clock();
        this.oldElapsedTime = 0;
        this.groundSize = 25;
        this.ground = null;
        this.wallMeshes = [];

        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createPhysicsWorld();
        this.createInfiniteGround();
        this.createGround();
        this.createWalls();
        this.createTrees();
        this.setupResize();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111); // Fond sombre
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 10);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }

    createLights() {
        // Ambient light - lumière générale de la scène
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Spot light - main light focused on the ground
        const spotLight = new THREE.SpotLight(0xffffff, 200);
        spotLight.position.set(0, 20, 0);
        spotLight.angle = Math.PI / 5; // Narrower angle
        spotLight.penumbra = 0.5; // Soft edges
        spotLight.decay = 2;
        spotLight.distance = 40; // Limited distance
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);

        // Lumières directionnelles pour éclairer les arbres autour de l'arène
        const treeLight1 = new THREE.DirectionalLight(0xaaccff, 0.6);
        treeLight1.position.set(50, 30, 50);
        this.scene.add(treeLight1);

        const treeLight2 = new THREE.DirectionalLight(0xffccaa, 0.6);
        treeLight2.position.set(-50, 30, -50);
        this.scene.add(treeLight2);

        // Hemisphere light pour un éclairage naturel du ciel/sol
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.4);
        this.scene.add(hemisphereLight);
    }

    createPhysicsWorld() {
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);

        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            { friction: 0.3, restitution: 0.5 }
        );
        this.physicsWorld.addContactMaterial(defaultContactMaterial);
        this.physicsWorld.defaultContactMaterial = defaultContactMaterial;
    }

    createInfiniteGround() {
        // Shader pour sol infini avec grille procédurale
        const vertexShader = `
            varying vec3 vWorldPosition;
            varying vec2 vUv;

            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `;

        const fragmentShader = `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uFogColor;
            uniform float uFogNear;
            uniform float uFogFar;
            uniform float uGridSize;
            uniform float uGridThickness;

            varying vec3 vWorldPosition;
            varying vec2 vUv;

            void main() {
                // Grille procédurale basée sur les coordonnées monde
                vec2 grid = abs(fract(vWorldPosition.xz / uGridSize - 0.5) - 0.5) / fwidth(vWorldPosition.xz / uGridSize);
                float line = min(grid.x, grid.y);
                float gridPattern = 1.0 - min(line, 1.0);

                // Couleur de base + lignes de grille
                vec3 color = mix(uColor1, uColor2, gridPattern * uGridThickness);

                // Fog basé sur la distance
                float depth = length(vWorldPosition.xz);
                float fogFactor = smoothstep(uFogNear, uFogFar, depth);
                color = mix(color, uFogColor, fogFactor);

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const infiniteGroundMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uColor1: { value: new THREE.Color(0x1a1a1a) },      // Gris très foncé
                uColor2: { value: new THREE.Color(0x333333) },      // Gris lignes
                uFogColor: { value: new THREE.Color(0x111111) },    // Même que le fond
                uFogNear: { value: 30.0 },
                uFogFar: { value: 150.0 },
                uGridSize: { value: 2.0 },                          // Taille des carreaux
                uGridThickness: { value: 0.8 }
            },
            side: THREE.DoubleSide
        });

        const infiniteGroundGeometry = new THREE.PlaneGeometry(2000, 2000);
        this.infiniteGround = new THREE.Mesh(infiniteGroundGeometry, infiniteGroundMaterial);
        this.infiniteGround.rotation.x = -Math.PI / 2;
        this.infiniteGround.position.y = -0.01; // Légèrement en dessous du sol de l'arène
        this.scene.add(this.infiniteGround);
    }

    createGround() {
        // Three.js ground
        const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x0a2a0a });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // CANNON ground
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane()
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(groundBody);
    }

    createWalls() {
        const wallHeight = 3;
        const wallThickness = 0.5;
        const halfSize = this.groundSize / 2;

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });

        // Wall positions: [x, z, rotationY, width]
        const walls = [
            { x: 0, z: -halfSize, rotY: 0, width: this.groundSize },           // Back
            { x: 0, z: halfSize, rotY: 0, width: this.groundSize },            // Front
            { x: -halfSize, z: 0, rotY: Math.PI / 2, width: this.groundSize }, // Left
            { x: halfSize, z: 0, rotY: Math.PI / 2, width: this.groundSize }   // Right
        ];

        walls.forEach(wall => {
            // Three.js wall
            const geometry = new THREE.BoxGeometry(wall.width, wallHeight, wallThickness);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(wall.x, wallHeight / 2, wall.z);
            mesh.rotation.y = wall.rotY;
            this.scene.add(mesh);
            this.wallMeshes.push(mesh);

            // CANNON wall
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(wall.width / 2, wallHeight / 2, wallThickness / 2))
            });
            body.position.set(wall.x, wallHeight / 2, wall.z);
            body.quaternion.setFromEuler(0, wall.rotY, 0);
            this.physicsWorld.addBody(body);
        });
    }

    createTrees() {
        const numTrees = 25;
        const minDistance = 15;  // Distance min du centre
        const maxDistance = 60;  // Distance max du centre
        const halfWall = this.groundSize / 2 + 1; // Zone interdite (intérieur murs)

        for (let i = 0; i < numTrees; i++) {
            // Position aléatoire en dehors de l'arène
            let x, z, distance;
            do {
                const angle = Math.random() * Math.PI * 2;
                distance = minDistance + Math.random() * (maxDistance - minDistance);
                x = Math.cos(angle) * distance;
                z = Math.sin(angle) * distance;
            } while (Math.abs(x) < halfWall && Math.abs(z) < halfWall);

            // Créer l'arbre avec taille et branches aléatoires
            const size = 0.3 + Math.random() * 0.3;
            const branches = 3 + Math.floor(Math.random() * 2);
            const tree = createTree(size, branches);

            tree.position.set(x, 0, z);
            tree.rotation.y = Math.random() * Math.PI * 2;

            this.scene.add(tree);
        }
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    addObject(gameObject) {
        this.objects.push(gameObject);
    }

    getObjectByMesh(mesh) {
        return this.objects.find(obj => obj.getMesh() === mesh);
    }

    getAllMeshes() {
        return this.objects.map(obj => obj.getMesh());
    }

    getAllRaycastTargets() {
        // Retourne tous les meshes pour le raycasting (objets + sol + murs)
        return [...this.getAllMeshes(), this.ground, ...this.wallMeshes];
    }

    update() {
        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = elapsedTime - this.oldElapsedTime;
        this.oldElapsedTime = elapsedTime;

        // Update physics
        this.physicsWorld.step(1 / 60, deltaTime, 3);

        // Sync all objects
        for (const object of this.objects) {
            object.update();
        }

        return deltaTime;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
