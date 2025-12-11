// Roam Filter Export - Tree Builder
// Builds export trees from query results, merging ancestors and descendants

import { getBlockWithDescendants, getBlockString } from './queries.js';

/**
 * Build the complete export tree from target blocks
 * @param {Array} targetBlocks - Blocks found by query (with parents)
 * @returns {Array} - Array of root-level nodes ready for export
 */
export const buildExportTree = (targetBlocks) => {
    if (!targetBlocks || targetBlocks.length === 0) {
        return [];
    }

    // Step 1: Build a map of all unique nodes we need
    const nodeMap = new Map(); // uid -> {uid, content, children: [], isTarget: bool}
    const rootUids = new Set();

    // Process each target block
    for (const block of targetBlocks) {
        const uid = block[":block/uid"];
        const content = block[":block/string"] || "";
        const parents = block[":block/parents"] || [];

        // Add the target block itself
        if (!nodeMap.has(uid)) {
            nodeMap.set(uid, {
                uid,
                content,
                children: [],
                isTarget: true
            });
        } else {
            nodeMap.get(uid).isTarget = true;
        }

        // Build ancestor chain
        if (parents.length === 0) {
            // This block is at root level
            rootUids.add(uid);
        } else {
            // Sort parents by order (closest parent first based on tree structure)
            const sortedParents = [...parents].reverse(); // Parents come root-first, we need leaf-first

            let childUid = uid;
            for (let i = 0; i < sortedParents.length; i++) {
                const parent = sortedParents[i];
                const parentUid = parent[":block/uid"];
                const parentContent = parent[":block/string"] || "";

                if (!nodeMap.has(parentUid)) {
                    nodeMap.set(parentUid, {
                        uid: parentUid,
                        content: parentContent,
                        children: [],
                        isTarget: false
                    });
                }

                // Link child to parent
                const parentNode = nodeMap.get(parentUid);
                if (!parentNode.children.some(c => c.uid === childUid)) {
                    parentNode.children.push(nodeMap.get(childUid));
                }

                childUid = parentUid;

                // Last parent is root
                if (i === sortedParents.length - 1) {
                    rootUids.add(parentUid);
                }
            }
        }
    }

    // Step 2: For each target node, fetch and attach its complete descendants
    for (const [uid, node] of nodeMap) {
        if (node.isTarget) {
            const fullTree = getBlockWithDescendants(uid);
            if (fullTree && fullTree.children && fullTree.children.length > 0) {
                // Replace children with full descendant tree
                node.children = fullTree.children;
            }
        }
    }

    // Step 3: Collect root nodes and sort children
    const roots = [];
    for (const uid of rootUids) {
        const node = nodeMap.get(uid);
        if (node) {
            sortChildrenRecursively(node);
            roots.push(node);
        }
    }

    return roots;
};

/**
 * Sort children recursively by their content (alphabetically for consistency)
 */
const sortChildrenRecursively = (node) => {
    if (node.children && node.children.length > 0) {
        // Keep original order for now (Roam's order)
        node.children.forEach(child => sortChildrenRecursively(child));
    }
};

/**
 * Merge multiple trees that share common ancestors
 * @param {Array} trees - Array of tree roots
 * @returns {Array} - Merged trees
 */
export const mergeTrees = (trees) => {
    if (!trees || trees.length <= 1) {
        return trees;
    }

    const mergedMap = new Map();

    for (const tree of trees) {
        if (mergedMap.has(tree.uid)) {
            // Merge children
            const existing = mergedMap.get(tree.uid);
            mergeChildren(existing, tree);
        } else {
            mergedMap.set(tree.uid, { ...tree, children: [...tree.children] });
        }
    }

    return Array.from(mergedMap.values());
};

/**
 * Merge children from source into target
 */
const mergeChildren = (target, source) => {
    for (const sourceChild of source.children) {
        const existingChild = target.children.find(c => c.uid === sourceChild.uid);
        if (existingChild) {
            mergeChildren(existingChild, sourceChild);
        } else {
            target.children.push({ ...sourceChild, children: [...sourceChild.children] });
        }
    }
};
