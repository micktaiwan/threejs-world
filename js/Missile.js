import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { soundManager } from './SoundManager.js';
import { ParticleSystem } from './ParticleSystem.js';

export class Missile {
    constructor(world, scene, position, direction, targetPoint) {
        this.world = world;
        this.scene = scene;
        this.startPosition = position.clone();
        this.direction = direction.clone().normalize();
        this.targetPoint = targetPoint ? targetPoint.clone() : null;

        // Vitesse avec accélération
        this.initialSpeed = 5;
        this.maxSpeed = 35;
        this.currentSpeed = this.initialSpeed;
        this.acceleration = 20;

        this.maxDistance = 50;
        this.distanceTraveled = 0;
        this.isActive = true;
        this.sound = null;
        this.targetMarker = null;
        this.blinkTime = 0;

        // Système de particules pour le propulseur
        this.thrusterParticles = new ParticleSystem(scene, {
            maxParticles: 200,
            particleSize: 0.15,
            color: 0xff4400,
            lifetime: 0.4,
            spread: 0.3,
            velocity: new THREE.Vector3(0, 0, 3),
            gravity: -0.5
        });

        // Systèmes de particules pour l'explosion (plusieurs couches)
        // Couche 1: Boule de feu principale
        this.explosionParticles = new ParticleSystem(scene, {
            maxParticles: 200,
            particleSize: 0.5,
            color: 0xff6600,
            lifetime: 0.6,
            spread: 1.5,
            gravity: -1
        });

        // Couche 2: Étincelles rapides
        this.sparkParticles = new ParticleSystem(scene, {
            maxParticles: 150,
            particleSize: 0.15,
            color: 0xffff00,
            lifetime: 0.4,
            spread: 0.5,
            gravity: -3
        });

        // Couche 3: Fumée
        this.smokeParticles = new ParticleSystem(scene, {
            maxParticles: 80,
            particleSize: 1.0,
            color: 0x444444,
            lifetime: 1.5,
            spread: 0.8,
            gravity: 1
        });

        // Couche 4: Débris
        this.debrisParticles = new ParticleSystem(scene, {
            maxParticles: 50,
            particleSize: 0.2,
            color: 0x222222,
            lifetime: 1.2,
            spread: 0.3,
            gravity: -8
        });

        this.createMesh();
        this.createBody();
        this.createTargetMarker();
        this.startSound();
    }

    createTargetMarker() {
        if (!this.targetPoint) return;

        // Créer un groupe pour le marqueur de cible
        this.targetMarker = new THREE.Group();

        // Anneau principal
        const ringGeometry = new THREE.TorusGeometry(0.3, 0.03, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.targetMarker.add(ring);

        // Croix au centre
        const crossMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1
        });

        // Barre horizontale
        const hBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.03, 0.03),
            crossMaterial
        );
        this.targetMarker.add(hBar);

        // Barre verticale
        const vBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.5, 0.03),
            crossMaterial
        );
        this.targetMarker.add(vBar);

        // Point central lumineux
        const centerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 1
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        this.targetMarker.add(center);

        // Positionner à la cible
        this.targetMarker.position.copy(this.targetPoint);

        // Orienter vers la caméra (billboard-like mais on garde l'orientation fixe)
        this.targetMarker.lookAt(this.startPosition);

        this.scene.add(this.targetMarker);
    }

    createMesh() {
        this.group = new THREE.Group();

        // Corps du missile (tube) - émissif pour briller
        const bodyGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);

        // Tête du missile (cone) - à l'avant (+Z car lookAt pointe +Z vers la cible)
        const headGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x330000,
            metalness: 0.5
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2;  // Pointe vers +Z (avant)
        head.position.z = 0.3;          // Avant du missile
        this.group.add(head);

        // Propulseur (anneau lumineux à l'arrière)
        const thrusterGeometry = new THREE.TorusGeometry(0.04, 0.015, 8, 16);
        const thrusterMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600
        });
        const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thruster.position.z = -0.25;    // Arrière du missile
        this.group.add(thruster);

        // Lumière du propulseur
        this.thrusterLight = new THREE.PointLight(0xff4400, 2, 3);
        this.thrusterLight.position.z = -0.3;  // Arrière du missile
        this.group.add(this.thrusterLight);

        // Orienter vers la direction
        const lookAt = new THREE.Vector3().addVectors(this.startPosition, this.direction);
        this.group.position.copy(this.startPosition);
        this.group.lookAt(lookAt);

        this.scene.add(this.group);
    }

    createBody() {
        this.body = new CANNON.Body({
            mass: 0.1,
            shape: new CANNON.Sphere(0.1),
            position: new CANNON.Vec3(
                this.startPosition.x,
                this.startPosition.y,
                this.startPosition.z
            ),
            collisionResponse: false,
            linearDamping: 0,
            angularDamping: 0
        });

        // Désactiver complètement la gravité pour ce body
        this.body.gravity = new CANNON.Vec3(0, 0, 0);

        // Vitesse initiale
        this.body.velocity.set(
            this.direction.x * this.currentSpeed,
            this.direction.y * this.currentSpeed,
            this.direction.z * this.currentSpeed
        );

        // Détecter les collisions (explose sur tout : objets, murs, sol)
        this.body.addEventListener('collide', (event) => {
            this.explode(event.body);
        });

        this.world.addBody(this.body);
    }

    startSound() {
        this.sound = soundManager.startMissileSound();
    }

    stopSound() {
        if (this.sound) {
            soundManager.stopMissileSound(this.sound);
            this.sound = null;
        }
    }

    update(deltaTime) {
        if (!this.isActive) {
            // Continuer à update toutes les particules d'explosion
            this.explosionParticles.update(deltaTime);
            this.sparkParticles.update(deltaTime);
            this.smokeParticles.update(deltaTime);
            this.debrisParticles.update(deltaTime);
            return;
        }

        // Accélérer le missile
        if (this.currentSpeed < this.maxSpeed) {
            this.currentSpeed += this.acceleration * deltaTime;
            this.currentSpeed = Math.min(this.currentSpeed, this.maxSpeed);
        }

        // TOUJOURS forcer la vélocité (annule la gravité)
        this.body.velocity.set(
            this.direction.x * this.currentSpeed,
            this.direction.y * this.currentSpeed,
            this.direction.z * this.currentSpeed
        );

        // Mettre à jour la position du mesh
        this.group.position.copy(this.body.position);

        // Émettre des particules du propulseur (à l'arrière, -Z local = -direction en world)
        const thrusterPos = this.group.position.clone();
        thrusterPos.sub(this.direction.clone().multiplyScalar(0.3));
        this.thrusterParticles.setPosition(thrusterPos);
        this.thrusterParticles.setDirection(this.direction);
        this.thrusterParticles.emit(3);
        this.thrusterParticles.update(deltaTime);

        // Faire clignoter la lumière du propulseur
        this.thrusterLight.intensity = 2 + Math.random() * 2;

        // Animer le clignotement de la cible
        if (this.targetMarker) {
            this.blinkTime += deltaTime * 16; // Fréquence rapide (~8Hz)
            const opacity = 0.3 + Math.abs(Math.sin(this.blinkTime)) * 0.7;
            this.targetMarker.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacity;
                }
            });
        }

        // Calculer la distance parcourue
        this.distanceTraveled = this.group.position.distanceTo(this.startPosition);

        // Exploser si distance > 50m
        if (this.distanceTraveled >= this.maxDistance) {
            this.explode(null);
        }
    }

    explode(hitBody) {
        if (!this.isActive) return;
        this.isActive = false;

        this.stopSound();
        soundManager.playExplosion();

        const pos = this.group.position.clone();

        // Explosion multi-couches impressionnante
        // Boule de feu principale
        this.explosionParticles.emitExplosion(pos, 120, 10);
        // Étincelles rapides
        this.sparkParticles.emitExplosion(pos, 80, 15);
        // Fumée (monte lentement)
        this.smokeParticles.emitExplosion(pos, 40, 3);
        // Débris (tombe avec gravité)
        this.debrisParticles.emitExplosion(pos, 30, 12);

        // Appliquer une force aux objets proches
        const explosionForce = 20;

        if (hitBody && hitBody.mass > 0) {
            const direction = new CANNON.Vec3(
                hitBody.position.x - pos.x,
                hitBody.position.y - pos.y,
                hitBody.position.z - pos.z
            );
            direction.normalize();
            direction.scale(explosionForce, direction);
            direction.y += 8;
            hitBody.applyImpulse(direction);
        }

        // Supprimer le mesh du missile
        this.scene.remove(this.group);

        // Supprimer le body
        if (this.body) {
            this.world.removeBody(this.body);
            this.body = null;
        }

        // Détruire les particules du propulseur
        this.thrusterParticles.destroy();

        // Supprimer le marqueur de cible
        if (this.targetMarker) {
            this.scene.remove(this.targetMarker);
            this.targetMarker = null;
        }
    }

    isFullyDone() {
        // Le missile est complètement fini quand toutes les explosions sont terminées
        if (this.isActive) return false;

        // Vérifier si des particules sont encore actives dans tous les systèmes
        const hasFireParticles = this.explosionParticles.particles.some(p => p.active);
        const hasSparkParticles = this.sparkParticles.particles.some(p => p.active);
        const hasSmokeParticles = this.smokeParticles.particles.some(p => p.active);
        const hasDebrisParticles = this.debrisParticles.particles.some(p => p.active);

        return !hasFireParticles && !hasSparkParticles && !hasSmokeParticles && !hasDebrisParticles;
    }

    destroy() {
        this.stopSound();
        if (this.group.parent) {
            this.scene.remove(this.group);
        }
        if (this.body) {
            this.world.removeBody(this.body);
            this.body = null;
        }
        this.thrusterParticles.destroy();
        this.explosionParticles.destroy();
        this.sparkParticles.destroy();
        this.smokeParticles.destroy();
        this.debrisParticles.destroy();

        // Supprimer le marqueur de cible
        if (this.targetMarker) {
            this.scene.remove(this.targetMarker);
            this.targetMarker = null;
        }
    }
}
