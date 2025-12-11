// Roam Filter Export - Query Engine
// Datalog queries for finding and retrieving blocks

/**
 * Check if Roam API is available
 */
export const isRoamAPIAvailable = () => {
    return typeof window !== 'undefined' &&
        window.roamAlphaAPI &&
        typeof window.roamAlphaAPI.data?.q === 'function';
};

/**
 * Find all blocks that reference a specific tag/page
 * @param {string} tagName - The tag name without # (e.g., "filtrarEsto")
 * @returns {Array} - Array of {uid, string, parents} objects
 */
export const findBlocksByTag = (tagName) => {
    if (!isRoamAPIAvailable()) {
        console.error("Roam API is not available");
        return [];
    }

    try {
        // Query to find blocks that reference the tag, including their parents
        const results = window.roamAlphaAPI.data.q(`
      [:find (pull ?block [:block/uid :block/string 
                           {:block/parents [:block/uid :block/string :block/order]}])
       :where
       [?tag :node/title "${tagName}"]
       [?block :block/refs ?tag]]
    `);

        if (!results || results.length === 0) {
            return [];
        }

        // Flatten results (query returns [[block], [block], ...])
        return results.map(r => r[0]).filter(Boolean);
    } catch (err) {
        console.error("Error in findBlocksByTag:", err);
        return [];
    }
};

/**
 * Get a block with all its descendants recursively
 * @param {string} blockUid - The block UID
 * @returns {Object|null} - Tree structure {uid, content, children}
 */
export const getBlockWithDescendants = (blockUid) => {
    if (!isRoamAPIAvailable() || !blockUid) {
        return null;
    }

    try {
        const result = window.roamAlphaAPI.pull(
            `[:block/uid :block/string :block/order 
        {:block/children [:block/uid :block/string :block/order ...]}]`,
            [":block/uid", blockUid]
        );

        if (!result) return null;

        // Transform to simpler structure
        return transformBlock(result);
    } catch (err) {
        console.error("Error in getBlockWithDescendants:", err);
        return null;
    }
};

/**
 * Transform Roam API block format to simpler structure
 */
const transformBlock = (block) => {
    if (!block) return null;

    const node = {
        uid: block[":block/uid"],
        content: block[":block/string"] || "",
        children: []
    };

    if (block[":block/children"]) {
        const sortedChildren = block[":block/children"]
            .sort((a, b) => (a[":block/order"] || 0) - (b[":block/order"] || 0));

        node.children = sortedChildren
            .map(child => transformBlock(child))
            .filter(Boolean);
    }

    return node;
};

/**
 * Get block info (string content) by UID
 * @param {string} blockUid 
 * @returns {string|null}
 */
export const getBlockString = (blockUid) => {
    if (!isRoamAPIAvailable() || !blockUid) {
        return null;
    }

    try {
        const result = window.roamAlphaAPI.pull(
            "[:block/string]",
            [":block/uid", blockUid]
        );
        return result?.[":block/string"] || null;
    } catch (err) {
        console.error("Error in getBlockString:", err);
        return null;
    }
};
