# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Three.js-based 3D interactive game where players control a first-person camera in an arena, spawn objects, and launch missiles to destroy them. Pure vanilla JavaScript using ES6 modules with CDN dependencies.

## Development Commands

**No build system** - Open `index.html` directly in a modern browser to run.

Dependencies are loaded via CDN import maps:
- Three.js v0.160.0
- Cannon-ES v0.20.0

## Architecture

### Module Structure

```
js/
├── main.js           # Game loop & orchestration (entry point)
├── World.js          # Three.js scene, Cannon-ES physics, lighting, arena
├── Controls.js       # Pointer Lock API, ZQSD/WASD input, camera movement
├── Missile.js        # Projectile logic, particle explosions, target marker
├── GameObject.js     # Base class for physics-enabled objects
├── Cube.js           # Cube object (extends GameObject)
├── Sphere.js         # Sphere object (extends GameObject)
├── Tree.js           # Procedural tree generation (recursive branching)
├── ParticleSystem.js # GPU-based particle effects
└── SoundManager.js   # Web Audio API procedural sound synthesis
```

### Layer Architecture

1. **World.js** - Core engine: initializes Three.js scene/camera/renderer, Cannon-ES physics world (gravity -9.82), lighting system, procedural ground with shader-based grid, bounded arena with walls and trees

2. **GameObject** - Base class providing Three.js mesh + Cannon-ES body sync, attached point lights, collision sounds, `destroy()` cleanup

3. **Controls.js** - FPS controls via Pointer Lock API, inertia-based movement with friction, raycasting for missile targeting

4. **Missile.js** - Self-propelled projectile with acceleration, 4-layer particle explosion (fire, sparks, smoke, debris), audio effects

5. **ParticleSystem.js** - GPU particles with custom velocity/lifetime/gravity, additive blending

6. **SoundManager.js** - Procedurally generated sounds (no audio files), oscillator-based collision/missile/explosion effects

### Data Flow

```
Input (Controls) → main.js game loop
    ├→ World.update()     → physics step (1/60s)
    ├→ Controls.update()  → camera movement
    ├→ Missile.update()   → trajectory, particles, collision
    ├→ GameObject.update()→ mesh-physics sync
    └→ World.render()     → Three.js render
```

## Key Implementation Details

- **No build step**: ES6 modules loaded directly by browser
- **Physics tick rate**: 60fps fixed timestep
- **Memory management**: Explicit `.destroy()` calls clean up Three.js geometries/materials and Cannon-ES bodies
- **Missiles**: Set velocity every frame to override physics gravity, `collisionResponse: false` prevents rebound
- **Particles**: Pooled (max 200 per system), frustum culling disabled
- **Audio context**: Lazily initialized, auto-resumed if suspended

## Game Controls

- **ZQSD/WASD**: Horizontal movement
- **E/A**: Vertical movement (up/down)
- **Click**: Fire missile
- **R**: Reset camera position
- **Pointer**: Look around (after clicking to lock)
