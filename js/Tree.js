import * as THREE from 'three';

/**
 * Generates a procedural tree using recursive branching
 * Based on https://github.com/lmparppei/deadtree
 */
export function createTree(size = 0.4, branchLevels = 4) {
    const sizeModifier = 0.65;
    const branchPivots = [];

    const material = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.9,
        metalness: 0.1
    });

    const tree = createBranch(size, material, branchLevels, false, sizeModifier, branchPivots);
    tree.branchPivots = branchPivots;

    return tree;
}

function createBranch(size, material, children, isChild, sizeModifier, branchPivots) {
    const branchPivot = new THREE.Object3D();
    const branchEnd = new THREE.Object3D();

    branchPivots.push(branchPivot);

    // Random branch length
    const length = Math.random() * (size * 10) + size * 5;

    // End size (0 if no more children)
    const endSize = children === 0 ? 0 : size * sizeModifier;

    // Create cylinder for branch
    const geometry = new THREE.CylinderGeometry(endSize, size, length, 6, 1, true);
    const branch = new THREE.Mesh(geometry, material);

    branchPivot.add(branch);
    branch.add(branchEnd);

    // Position branch
    branch.position.y = length / 2;
    branchEnd.position.y = length / 2 - size * 0.4;

    if (isChild) {
        // Child branches: random angles
        branchPivot.rotation.z += Math.random() * 1.5 - sizeModifier * 1.05;
        branchPivot.rotation.x += Math.random() * 1.5 - sizeModifier * 1.05;
    } else {
        // Trunk: slight random tilt
        branch.castShadow = true;
        branch.receiveShadow = true;
        branchPivot.rotation.z += Math.random() * 0.1 - 0.05;
        branchPivot.rotation.x += Math.random() * 0.1 - 0.05;
    }

    // Recursively create child branches
    if (children > 0) {
        const numChildren = Math.floor(Math.random() * 2) + 2; // 2-3 children
        for (let c = 0; c < numChildren; c++) {
            const child = createBranch(
                size * sizeModifier,
                material,
                children - 1,
                true,
                sizeModifier,
                branchPivots
            );
            branchEnd.add(child);
        }
    }

    return branchPivot;
}
