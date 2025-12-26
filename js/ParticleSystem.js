import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.particles = [];
        this.geometry = null;
        this.material = null;
        this.points = null;
        this.isActive = true;

        // Options par défaut
        this.maxParticles = options.maxParticles || 100;
        this.particleSize = options.particleSize || 0.2;
        this.color = options.color || 0xff4400;
        this.lifetime = options.lifetime || 1;
        this.emissionRate = options.emissionRate || 50;
        this.velocity = options.velocity || new THREE.Vector3(0, 1, 0);
        this.spread = options.spread || 0.5;
        this.gravity = options.gravity || 0;
        this.fadeOut = options.fadeOut !== false;
        this.sizeDecay = options.sizeDecay || 0;

        this.position = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, -1);

        this.init();
    }

    init() {
        // Créer la géométrie avec des positions vides
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);
        const sizes = new Float32Array(this.maxParticles);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Matériau avec shader pour taille variable
        this.material = new THREE.PointsMaterial({
            size: this.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false; // Les particules peuvent être partout
        this.scene.add(this.points);

        // Initialiser le tableau de particules
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: this.lifetime,
                size: this.particleSize,
                active: false
            });
        }
    }

    setPosition(pos) {
        this.position.copy(pos);
    }

    setDirection(dir) {
        this.direction.copy(dir).normalize();
    }

    emit(count = 1) {
        const baseColor = new THREE.Color(this.color);

        for (let i = 0; i < count; i++) {
            // Trouver une particule inactive
            const particle = this.particles.find(p => !p.active);
            if (!particle) continue;

            particle.active = true;
            particle.life = this.lifetime;
            particle.maxLife = this.lifetime;
            particle.size = this.particleSize * (0.5 + Math.random() * 0.5);

            // Position avec légère variation
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * this.spread * 0.2;
            particle.position.y += (Math.random() - 0.5) * this.spread * 0.2;
            particle.position.z += (Math.random() - 0.5) * this.spread * 0.2;

            // Vélocité dans la direction opposée au missile + spread
            particle.velocity.copy(this.direction).multiplyScalar(-this.velocity.length());
            particle.velocity.x += (Math.random() - 0.5) * this.spread;
            particle.velocity.y += (Math.random() - 0.5) * this.spread;
            particle.velocity.z += (Math.random() - 0.5) * this.spread;

            // Couleur avec variation
            particle.color = baseColor.clone();
            particle.color.r = Math.min(1, particle.color.r + Math.random() * 0.3);
            particle.color.g = Math.min(1, particle.color.g * (0.5 + Math.random() * 0.5));
        }
    }

    emitExplosion(position, count = 50, force = 5) {
        const colors = [0xff4400, 0xff6600, 0xffaa00, 0xffff00, 0xff2200];

        for (let i = 0; i < count; i++) {
            const particle = this.particles.find(p => !p.active);
            if (!particle) continue;

            particle.active = true;
            particle.life = 0.5 + Math.random() * 0.5;
            particle.maxLife = particle.life;
            particle.size = this.particleSize * (1 + Math.random() * 2);

            particle.position.copy(position);

            // Vélocité dans toutes les directions
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = force * (0.5 + Math.random() * 0.5);

            particle.velocity.set(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.sin(phi) * Math.sin(theta) * speed,
                Math.cos(phi) * speed
            );

            // Couleur aléatoire parmi les couleurs d'explosion
            particle.color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const sizes = this.geometry.attributes.size.array;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            if (particle.active) {
                // Update vie
                particle.life -= deltaTime;

                if (particle.life <= 0) {
                    particle.active = false;
                    sizes[i] = 0;
                } else {
                    // Update position
                    particle.position.x += particle.velocity.x * deltaTime;
                    particle.position.y += particle.velocity.y * deltaTime + this.gravity * deltaTime;
                    particle.position.z += particle.velocity.z * deltaTime;

                    // Update taille (décroissance)
                    const lifeRatio = particle.life / particle.maxLife;
                    sizes[i] = particle.size * lifeRatio;

                    // Update couleur (fade vers le rouge/noir)
                    const fade = this.fadeOut ? lifeRatio : 1;
                    colors[i * 3] = particle.color.r * fade;
                    colors[i * 3 + 1] = particle.color.g * fade * fade; // Le vert fade plus vite
                    colors[i * 3 + 2] = particle.color.b * fade * fade * fade;
                }

                positions[i * 3] = particle.position.x;
                positions[i * 3 + 1] = particle.position.y;
                positions[i * 3 + 2] = particle.position.z;
            } else {
                sizes[i] = 0;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    destroy() {
        this.isActive = false;
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}
