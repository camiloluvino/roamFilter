// Roam Filter Export - Smart Export for Filtered Blocks
// Version: 2.11.1
// Date: 2026-01-19 00:59
//
// Created by Camilo Luvino
// https://github.com/camiloluvino/roamExportFilter
//
// Exports content filtered by tags using Datalog queries.
// Works even when blocks are collapsed (unlike DOM-based approaches).

// ============================================
// JSZIP LOADING (for ZIP exports when >5 files)
// ============================================

// Load JSZip from CDN if not already loaded
const loadJSZip = () => {
  return new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });
};

// ============================================
// INLINE MODULES (Roam doesn't support ES modules)
// ============================================

// --- queries.js ---
const isRoamAPIAvailable = () => {
  return typeof window !== 'undefined' &&
    window.roamAlphaAPI &&
    typeof window.roamAlphaAPI.data?.q === 'function';
};

// Get the UID of the currently open page
const getCurrentPageUid = () => {
  // Try to get from URL hash (works for both page and daily notes)
  const match = window.location.hash.match(/\/page\/(.+?)(?:\/|$)/);
  if (match) {
    return match[1];
  }

  // For daily notes page, get from URL with date format
  const dailyMatch = window.location.hash.match(/\/(\d{2}-\d{2}-\d{4})(?:\/|$)/);
  if (dailyMatch) {
    // Convert date to Roam's daily page title format
    const dateStr = dailyMatch[1];
    const [month, day, year] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const roamDateTitle = date.toLocaleDateString('en-US', options);

    // Get the page UID for this date title
    const result = window.roamAlphaAPI.data.q(`
      [:find ?uid .
       :where
       [?page :node/title "${roamDateTitle}"]
       [?page :block/uid ?uid]]
    `);
    return result || null;
  }

  return null;
};

const findBlocksByTag = (tagName) => {
  if (!isRoamAPIAvailable()) {
    console.error("Roam API is not available");
    return [];
  }

  const pageUid = getCurrentPageUid();
  if (!pageUid) {
    console.error("Could not determine current page UID");
    return [];
  }

  if (DEBUG) console.log(`Searching for #${tagName} in page ${pageUid}`);

  try {
    // Find blocks that reference the tag AND belong to the current page
    // :block/page is the page entity where the block lives
    // Include :block/order to maintain correct sorting
    const results = window.roamAlphaAPI.data.q(`
      [:find (pull ?block [:block/uid :block/string :block/order
                           {:block/parents [:block/uid :block/string :block/order]}])
       :where
       [?tag :node/title "${tagName}"]
       [?block :block/refs ?tag]
       [?block :block/page ?page]
       [?page :block/uid "${pageUid}"]]
    `);

    if (!results || results.length === 0) {
      if (DEBUG) console.log(`No blocks found with #${tagName} in page ${pageUid}`);
      return [];
    }

    if (DEBUG) console.log(`Found ${results.length} blocks with #${tagName} in current page`);

    return results.map(r => r[0]).filter(Boolean);
  } catch (err) {
    console.error("Error in findBlocksByTag:", err);
    return [];
  }
};

const getBlockWithDescendants = (blockUid) => {
  if (!isRoamAPIAvailable() || !blockUid) {
    if (DEBUG) console.log(`getBlockWithDescendants: invalid input, blockUid=${blockUid}`);
    return null;
  }

  try {
    // Roam doesn't support recursive '...' syntax, so we need to manually recurse
    const result = window.roamAlphaAPI.pull(
      `[:block/uid :block/string :block/order {:block/children [:block/uid :block/order]}]`,
      [":block/uid", blockUid]
    );

    if (DEBUG) console.log(`getBlockWithDescendants raw result for ${blockUid}:`, result);

    if (!result) return null;

    // Build tree with manual recursion for children
    return buildTreeRecursively(result);
  } catch (err) {
    console.error("Error in getBlockWithDescendants:", err);
    return null;
  }
};

// Manually recurse to build complete tree
const buildTreeRecursively = (block) => {
  if (!block) return null;

  const uid = block[":block/uid"] || block.uid;
  const content = block[":block/string"] || block.string || "";
  const children = block[":block/children"] || block.children || [];

  const node = {
    uid,
    content,
    children: []
  };

  if (children.length > 0) {
    // Sort by order
    const sortedChildren = [...children].sort((a, b) => {
      const orderA = a[":block/order"] || a.order || 0;
      const orderB = b[":block/order"] || b.order || 0;
      return orderA - orderB;
    });

    // Fetch each child's full data and recurse
    for (const child of sortedChildren) {
      const childUid = child[":block/uid"] || child.uid;
      if (childUid) {
        const childData = window.roamAlphaAPI.pull(
          `[:block/uid :block/string :block/order {:block/children [:block/uid :block/order]}]`,
          [":block/uid", childUid]
        );
        if (childData) {
          const childNode = buildTreeRecursively(childData);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }
    }
  }

  return node;
};

const transformBlock = (block) => {
  if (!block) return null;

  // Handle both prefixed (:block/uid) and non-prefixed (uid) attribute names
  const uid = block[":block/uid"] || block.uid;
  const content = block[":block/string"] || block.string || "";
  const children = block[":block/children"] || block.children || [];
  const order = block[":block/order"] || block.order || 0;

  const node = {
    uid,
    content,
    children: []
  };

  if (children.length > 0) {
    const sortedChildren = [...children]
      .sort((a, b) => {
        const orderA = a[":block/order"] || a.order || 0;
        const orderB = b[":block/order"] || b.order || 0;
        return orderA - orderB;
      });

    node.children = sortedChildren
      .map(child => transformBlock(child))
      .filter(Boolean);
  }

  return node;
};

// --- export-by-root.js ---
// Get all root-level blocks (direct children of the page)
const getRootBlocks = (pageUid) => {
  if (!isRoamAPIAvailable() || !pageUid) {
    console.error("getRootBlocks: invalid input or API unavailable");
    return [];
  }

  try {
    // Use pull to get the page's direct children
    const pageData = window.roamAlphaAPI.pull(
      '[:block/uid {:block/children [:block/uid :block/string :block/order]}]',
      [':block/uid', pageUid]
    );

    if (!pageData || !pageData[':block/children']) {
      if (DEBUG) console.log(`No root blocks found in page ${pageUid}`);
      return [];
    }

    // Sort by order
    const blocks = pageData[':block/children']
      .sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));

    if (DEBUG) console.log(`Found ${blocks.length} root blocks in page ${pageUid}`);
    return blocks;
  } catch (err) {
    console.error("Error in getRootBlocks:", err);
    return [];
  }
};

// Count how many root blocks would match a given tag filter (for preview)
const countMatchingRoots = (rootBlocks, tagName) => {
  if (!tagName || !rootBlocks || rootBlocks.length === 0) {
    return rootBlocks ? rootBlocks.length : 0;
  }

  try {
    let count = 0;
    for (const root of rootBlocks) {
      const rootUid = root[':block/uid'] || root.uid;
      if (!rootUid) continue;

      // Quick check: does any block under this root reference the tag?
      const result = window.roamAlphaAPI.data.q(`
        [:find ?block .
         :where
         [?tag :node/title "${tagName}"]
         [?block :block/refs ?tag]
         [?root :block/uid "${rootUid}"]
         (or
           [?block :block/parents ?root]
           (and
             [?block :block/parents ?ancestor]
             [?ancestor :block/parents ?root]))]
      `);
      if (result) count++;
    }
    return count;
  } catch (err) {
    console.error("Error in countMatchingRoots:", err);
    return rootBlocks.length;
  }
};

// Get filtered children of a root block (or all children if no filter)
const getFilteredChildren = (rootUid, tagName = null) => {
  if (!rootUid) return [];

  try {
    if (!tagName) {
      // No filter - return complete tree
      const fullTree = getBlockWithDescendants(rootUid);
      return fullTree?.children || [];
    }

    // With filter - find children that contain the tag
    const results = window.roamAlphaAPI.data.q(`
      [:find (pull ?block [:block/uid :block/string :block/order
                           {:block/parents [:block/uid :block/string :block/order]}])
       :where
       [?tag :node/title "${tagName}"]
       [?block :block/refs ?tag]
       [?block :block/parents ?parent]
       [?parent :block/uid "${rootUid}"]]
    `);

    if (!results || results.length === 0) {
      // Also check for deeper descendants
      const deepResults = window.roamAlphaAPI.data.q(`
        [:find (pull ?block [:block/uid :block/string :block/order
                             {:block/parents [:block/uid :block/string :block/order]}])
         :where
         [?tag :node/title "${tagName}"]
         [?block :block/refs ?tag]
         [?root :block/uid "${rootUid}"]
         [?block :block/parents ?ancestor]
         [?ancestor :block/parents ?root]]
      `);

      if (!deepResults || deepResults.length === 0) {
        return [];
      }

      // For deep matches, get the block with its full subtree
      return deepResults
        .map(r => r[0])
        .filter(Boolean)
        .map(block => {
          const uid = block[":block/uid"] || block.uid;
          const fullTree = getBlockWithDescendants(uid);
          return fullTree;
        })
        .filter(Boolean)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // For direct children matches, get each with its full subtree
    return results
      .map(r => r[0])
      .filter(Boolean)
      .map(block => {
        const uid = block[":block/uid"] || block.uid;
        const fullTree = getBlockWithDescendants(uid);
        return fullTree;
      })
      .filter(Boolean)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  } catch (err) {
    console.error("Error in getFilteredChildren:", err);
    return [];
  }
};

// Convert root block to markdown with H1 heading
const rootBlockToMarkdown = (rootContent, childrenTree) => {
  let markdown = `# ${rootContent}\n\n`;

  if (childrenTree && childrenTree.length > 0) {
    markdown += treeToMarkdown(childrenTree);
  }

  return markdown;
};

// Generate safe filename from block content
const generateRootFilename = (blockContent) => {
  if (!blockContent) return "untitled.md";

  // Remove [[]] references but keep the text inside
  let safe = blockContent.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // Remove # tags
  safe = safe.replace(/#/g, '');

  // Replace problematic characters
  safe = safe.replace(/[\/\\:*?"<>|]/g, '_');

  // Replace multiple spaces/underscores with single underscore
  safe = safe.replace(/[\s_]+/g, '_');

  // Trim and limit length
  safe = safe.trim().substring(0, 50);

  // Remove trailing underscores
  safe = safe.replace(/_+$/, '');

  return `${safe || 'untitled'}.md`;
};

// --- tree-builder.js ---
const DEBUG = true; // Set to false in production

// Favorite tags for quick filter selection in Export by Root Blocks modal
// Edit this list to customize your frequently used tags
const FAVORITE_TAGS = [
  'textoÍntegro',
  'Gemini/Pro/3.0/resumen',
  'Gemini/Pro/3.0/respuestas',
  'Claude/Sonnet/4.5/resumen',
  'Claude/Sonnet/4.5/respuestas',
  'Claude/Opus/4.5/respuestas',
];


const buildExportTree = (targetBlocks) => {
  if (!targetBlocks || targetBlocks.length === 0) {
    return [];
  }

  if (DEBUG) {
    console.log("=== buildExportTree DEBUG ===");
    console.log("Target blocks received:", JSON.stringify(targetBlocks, null, 2));
  }

  const nodeMap = new Map();
  const rootUids = new Set();

  for (const block of targetBlocks) {
    // Handle both prefixed (:block/uid) and non-prefixed (uid) attribute names
    const uid = block.uid || block[":block/uid"];
    const content = block.string || block[":block/string"] || "";
    const parents = block.parents || block[":block/parents"] || [];

    if (DEBUG) {
      console.log(`Processing block: uid=${uid}, content="${content}", parents count=${parents.length}`);
    }

    // Add the target block itself
    // Get the block's order from the query result
    const blockOrder = block.order || block[":block/order"] || 0;

    if (!nodeMap.has(uid)) {
      nodeMap.set(uid, {
        uid,
        content,
        children: [],
        order: blockOrder,
        isTarget: true
      });
    } else {
      // Update content if already exists (might have been added as parent reference)
      const existingNode = nodeMap.get(uid);
      existingNode.isTarget = true;
      existingNode.order = blockOrder; // Update order
      if (!existingNode.content && content) {
        existingNode.content = content;
      }
    }

    if (parents.length === 0) {
      rootUids.add(uid);
    } else {
      // Parents come from root to leaf, we need to process leaf to root
      // So we reverse to go from immediate parent to root
      const sortedParents = [...parents].reverse();

      let childUid = uid;
      for (let i = 0; i < sortedParents.length; i++) {
        const parent = sortedParents[i];
        // Handle both prefixed and non-prefixed attribute names
        const parentUid = parent.uid || parent[":block/uid"];
        const parentContent = parent.string || parent[":block/string"] || parent.title || parent[":node/title"] || "";
        const parentOrder = parent.order || parent[":block/order"] || 0;

        // Skip parents with empty content - connect child directly to grandparent
        if (!parentContent || parentContent.trim() === "") {
          if (DEBUG) {
            console.log(`  Skipping empty parent: uid=${parentUid}`);
          }
          // If this is the last parent (root) and it's empty, mark child as root
          if (i === sortedParents.length - 1) {
            rootUids.add(childUid);
          }
          continue;
        }

        if (DEBUG && i === 0) {
          console.log(`  First parent: uid=${parentUid}, content="${parentContent}", order=${parentOrder}`);
        }

        if (!nodeMap.has(parentUid)) {
          nodeMap.set(parentUid, {
            uid: parentUid,
            content: parentContent,
            children: [],
            order: parentOrder,
            isTarget: false
          });
        }

        const parentNode = nodeMap.get(parentUid);
        const childNode = nodeMap.get(childUid);

        // Get child's order from the parent's perspective
        if (i === 0) {
          // First iteration - childUid is the target block
          // Get its order from the query data (target block's order relative to its immediate parent)
          const targetBlock = targetBlocks.find(b => (b.uid || b[":block/uid"]) === uid);
          const targetOrder = targetBlock?.parents?.find(p => (p.uid || p[":block/uid"]) === parentUid);
          if (targetOrder) {
            childNode.order = targetOrder.order || targetOrder[":block/order"] || 0;
          }
        }

        if (childNode && !parentNode.children.some(c => c.uid === childUid)) {
          parentNode.children.push(childNode);
        }

        childUid = parentUid;

        // Last parent in our reversed list is the root
        if (i === sortedParents.length - 1) {
          rootUids.add(parentUid);
        }
      }
    }
  }

  // Fetch complete descendants for target nodes
  for (const [uid, node] of nodeMap) {
    if (node.isTarget) {
      if (DEBUG) {
        console.log(`Fetching descendants for target: uid=${uid}, content="${node.content}"`);
      }
      const fullTree = getBlockWithDescendants(uid);
      if (DEBUG) {
        console.log(`  Full tree result:`, fullTree);
      }
      if (fullTree && fullTree.children && fullTree.children.length > 0) {
        node.children = fullTree.children;
      }
    }
  }

  // Sort all children by order before returning
  const sortChildren = (node) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
      node.children.forEach(sortChildren);
    }
  };

  // Calculate global order path for each root by tracing back through ancestors
  // This creates a comparable path like "0.3.2" representing the position at each level
  const calculateGlobalOrderPath = (rootUid) => {
    // Find the target block that led to this root
    for (const block of targetBlocks) {
      const uid = block.uid || block[":block/uid"];
      const parents = block.parents || block[":block/parents"] || [];

      // Check if this block's ancestry includes the root
      if (parents.length === 0 && uid === rootUid) {
        // This target block is itself a root
        const blockOrder = block.order || block[":block/order"] || 0;
        return [blockOrder];
      }

      // Check if rootUid is in the parents chain
      let foundInParents = false;
      let rootIndex = -1;
      for (let i = 0; i < parents.length; i++) {
        const parentUid = parents[i].uid || parents[i][":block/uid"];
        if (parentUid === rootUid) {
          foundInParents = true;
          rootIndex = i;
          break;
        }
      }

      if (foundInParents) {
        // Build order path from root (or page) down to this block
        const orderPath = [];

        // Add orders from the root's position down to the target block
        for (let i = rootIndex; i >= 0; i--) {
          const parent = parents[i];
          const parentOrder = parent.order || parent[":block/order"] || 0;
          orderPath.push(parentOrder);
        }

        // Add the target block's own order
        const blockOrder = block.order || block[":block/order"] || 0;
        orderPath.push(blockOrder);

        return orderPath;
      }
    }

    // Fallback: return just the node's own order
    const node = nodeMap.get(rootUid);
    return [node?.order || 0];
  };

  // Compare two order paths lexicographically
  const compareOrderPaths = (pathA, pathB) => {
    const maxLen = Math.max(pathA.length, pathB.length);
    for (let i = 0; i < maxLen; i++) {
      const a = pathA[i] ?? 0;
      const b = pathB[i] ?? 0;
      if (a !== b) {
        return a - b;
      }
    }
    return 0;
  };

  const roots = [];
  for (const uid of rootUids) {
    const node = nodeMap.get(uid);
    if (node) {
      sortChildren(node);
      node.globalOrderPath = calculateGlobalOrderPath(uid);
      roots.push(node);
    }
  }

  // Sort roots by their global order path
  roots.sort((a, b) => compareOrderPaths(a.globalOrderPath || [0], b.globalOrderPath || [0]));

  if (DEBUG) {
    console.log("Final roots (sorted by global order):", JSON.stringify(roots.map(r => ({
      uid: r.uid,
      content: r.content?.substring(0, 50),
      globalOrderPath: r.globalOrderPath
    })), null, 2));
  }

  return roots;
};

// --- exporter.js ---
const treeToMarkdown = (trees, indentLevel = 0) => {
  if (!trees || trees.length === 0) {
    return "";
  }

  const lines = [];
  const indent = "  ".repeat(indentLevel);

  for (const node of trees) {
    lines.push(`${indent}- ${node.content}`);

    if (node.children && node.children.length > 0) {
      const childrenMd = treeToMarkdown(node.children, indentLevel + 1);
      if (childrenMd) {
        lines.push(childrenMd);
      }
    }
  }

  return lines.join("\n");
};

const generateFilename = (tagName) => {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const safeTagName = tagName.replace(/[^a-zA-Z0-9]/g, "_");
  return `export_${safeTagName}_${dateStr}.md`;
};

const downloadFile = (content, filename) => {
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (err) {
    console.error("Error downloading file:", err);
    return false;
  }
};

const generateHeader = (tagName, blockCount) => {
  const date = new Date().toLocaleString();
  return `# Export: #${tagName}
> Generated: ${date}
> Blocks found: ${blockCount}

---

`;
};

// ============================================
// MAIN EXTENSION LOGIC
// ============================================

// Clean user input to extract just the page/tag name
// Supports: #tag, [[tag]], #[[tag]], or just "tag"
const cleanTagInput = (input) => {
  if (!input) return null;

  let cleaned = input.trim();

  // Remove # prefix
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.substring(1);
  }

  // Remove [[ prefix and ]] suffix
  if (cleaned.startsWith('[[') && cleaned.endsWith(']]')) {
    cleaned = cleaned.substring(2, cleaned.length - 2);
  }

  return cleaned.trim() || null;
};

const showNotification = (message, backgroundColor) => {
  try {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 10px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  } catch (err) {
    console.error("Error showing notification:", err);
  }
};

// ============================================
// UNIFIED EXPORT MODAL (with tabs)
// ============================================

// Unified export modal with tabs for "Por Filtros" and "Por Ramas"
const promptUnifiedExport = (pageName, pageUid) => {
  return new Promise((resolve) => {
    let currentDepth = 2; // Default depth

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal - LARGER for 1920x1080 screens
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 800px;
      max-width: 1000px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      overflow: hidden;
    `;

    // Tab styles
    const tabStyle = (active) => `
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      background: ${active ? 'white' : '#f0f0f0'};
      color: ${active ? '#137CBD' : '#666'};
      cursor: pointer;
      border-bottom: ${active ? '2px solid #137CBD' : '2px solid transparent'};
      transition: all 0.2s;
    `;

    // Depth button style
    const depthBtnStyle = (isActive) => `
      padding: 6px 12px;
      font-size: 13px;
      border: 1px solid ${isActive ? '#137CBD' : '#ccc'};
      background: ${isActive ? '#137CBD' : 'white'};
      color: ${isActive ? 'white' : '#666'};
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Render tree structure with checkboxes for "Por Ramas" tab
    const renderTree = (nodes, indentLevel = 0) => {
      if (!nodes || nodes.length === 0) return '<p style="color: #888; padding: 12px;">No hay bloques en esta página</p>';
      return nodes.map(node => {
        const indent = indentLevel * 24;
        const deepInfo = node.hasDeepChildren ? ` <span style="color: #888; font-size: 11px;">(+${node.deepChildrenCount} sub-bloques)</span>` : '';
        return `
          <div style="padding: 5px 0; padding-left: ${indent}px;">
            <label style="display: flex; align-items: flex-start; cursor: pointer; gap: 8px;">
              <input type="checkbox" data-uid="${node.uid}" class="branch-checkbox" style="margin-top: 3px; cursor: pointer; min-width: 16px;">
              <span style="font-size: 14px; line-height: 1.5;" title="${(node.fullContent || node.content || '').replace(/"/g, '&quot;')}">${node.content}${deepInfo}</span>
            </label>
            ${node.children && node.children.length > 0 ? renderTree(node.children, indentLevel + 1) : ''}
          </div>
        `;
      }).join('');
    };

    // Favorite tags chips
    const tagsHtml = FAVORITE_TAGS.map(tag =>
      `<span class="fav-tag-chip" data-tag="${tag}" style="
        display: inline-block;
        padding: 4px 10px;
        margin: 2px;
        background: #e8f4fc;
        color: #137CBD;
        border-radius: 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      ">#${tag}</span>`
    ).join('');

    // Get initial structure with default depth
    let structure = getPageStructure(pageUid, currentDepth);

    modal.innerHTML = `
      <!-- Header with tabs -->
      <div style="display: flex; background: #f5f5f5; border-bottom: 1px solid #e0e0e0;">
        <button id="tab-filters" style="${tabStyle(true)}">📋 Por Filtros</button>
        <button id="tab-branches" style="${tabStyle(false)}">🌳 Por Ramas</button>
        <div style="flex: 1;"></div>
        <span style="padding: 12px 16px; font-size: 12px; color: #888;">${pageName}</span>
      </div>
      
      <!-- Tab content container -->
      <div style="padding: 20px; flex: 1; overflow-y: auto;">
        
        <!-- Por Filtros content -->
        <div id="content-filters" style="display: block;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
            Exportar bloques que contengan un tag específico:
          </p>
          <input type="text" id="unified-tag-input" 
            style="width: 100%; padding: 12px 14px; font-size: 15px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
            placeholder="Ej: #resumen, [[concepto]], etc."
          />
          <div style="margin-top: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #888;">Tags favoritos:</p>
            <div id="fav-tags-container">${tagsHtml}</div>
          </div>
        </div>
        
        <!-- Por Ramas content -->
        <div id="content-branches" style="display: none;">
          <!-- Depth selector -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <span style="font-size: 13px; color: #666;">Profundidad:</span>
            <div id="depth-selector" style="display: flex; border-radius: 4px; overflow: hidden;">
              <button data-depth="1" style="${depthBtnStyle(false)}border-radius: 4px 0 0 4px;">1</button>
              <button data-depth="2" style="${depthBtnStyle(true)}border-left: none;">2</button>
              <button data-depth="3" style="${depthBtnStyle(false)}border-left: none;">3</button>
              <button data-depth="4" style="${depthBtnStyle(false)}border-left: none; border-radius: 0 4px 4px 0;">4</button>
            </div>
            <span style="font-size: 12px; color: #999;">niveles de jerarquía</span>
          </div>
          
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
            Selecciona las ramas que deseas exportar:
          </p>
          <div id="branch-tree-container" style="
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 12px;
            max-height: 400px;
            overflow-y: auto;
            background: #fafafa;
          ">
            ${renderTree(structure)}
          </div>
          <div style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
              <input type="checkbox" id="branch-filter-enabled">
              <span>Filtrar por tag (opcional):</span>
            </label>
            <input type="text" id="branch-filter-tag" 
              style="width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-top: 8px; opacity: 0.5;"
              placeholder="Ej: #resumen"
              disabled
            />
          </div>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="padding: 16px 20px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
        <span id="selection-info" style="font-size: 13px; color: #666;"></span>
        <div style="display: flex; gap: 8px;">
          <button id="unified-cancel" 
            style="padding: 10px 20px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;">
            Cancelar
          </button>
          <button id="unified-export" 
            style="padding: 10px 20px; font-size: 14px; border: none; border-radius: 4px; background: #137CBD; color: white; cursor: pointer;">
            Exportar
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Get elements
    const tabFilters = document.getElementById('tab-filters');
    const tabBranches = document.getElementById('tab-branches');
    const contentFilters = document.getElementById('content-filters');
    const contentBranches = document.getElementById('content-branches');
    const tagInput = document.getElementById('unified-tag-input');
    const branchFilterEnabled = document.getElementById('branch-filter-enabled');
    const branchFilterTag = document.getElementById('branch-filter-tag');
    const selectionInfo = document.getElementById('selection-info');
    const cancelBtn = document.getElementById('unified-cancel');
    const exportBtn = document.getElementById('unified-export');
    const treeContainer = document.getElementById('branch-tree-container');
    const favTagsContainer = document.getElementById('fav-tags-container');

    let activeTab = 'filters';

    // Tab switching
    const switchTab = (tab) => {
      activeTab = tab;
      if (tab === 'filters') {
        tabFilters.style.cssText = tabStyle(true);
        tabBranches.style.cssText = tabStyle(false);
        contentFilters.style.display = 'block';
        contentBranches.style.display = 'none';
        selectionInfo.textContent = '';
        tagInput.focus();
      } else {
        tabFilters.style.cssText = tabStyle(false);
        tabBranches.style.cssText = tabStyle(true);
        contentFilters.style.display = 'none';
        contentBranches.style.display = 'block';
        updateBranchCount();
      }
    };

    tabFilters.addEventListener('click', () => switchTab('filters'));
    tabBranches.addEventListener('click', () => switchTab('branches'));

    // Depth selector logic
    const depthSelector = document.getElementById('depth-selector');
    const updateDepth = (newDepth) => {
      if (newDepth === currentDepth) return;
      currentDepth = newDepth;

      // Update button styles
      depthSelector.querySelectorAll('button').forEach(btn => {
        const d = parseInt(btn.dataset.depth);
        const isFirst = d === 1;
        const isLast = d === 4;
        const isActive = d === currentDepth;
        btn.style.cssText = `
          padding: 6px 12px;
          font-size: 13px;
          border: 1px solid ${isActive ? '#137CBD' : '#ccc'};
          background: ${isActive ? '#137CBD' : 'white'};
          color: ${isActive ? 'white' : '#666'};
          cursor: pointer;
          transition: all 0.2s;
          ${isFirst ? 'border-radius: 4px 0 0 4px;' : ''}
          ${isLast ? 'border-radius: 0 4px 4px 0;' : ''}
          ${!isFirst ? 'border-left: none;' : ''}
        `;
      });

      // Re-fetch structure with new depth and re-render tree
      structure = getPageStructure(pageUid, currentDepth);
      treeContainer.innerHTML = renderTree(structure);

      // Re-attach checkbox listeners
      treeContainer.querySelectorAll('.branch-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBranchCount);
      });

      updateBranchCount();
    };

    depthSelector.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => updateDepth(parseInt(btn.dataset.depth)));
    });

    // Update branch selection count
    const updateBranchCount = () => {
      const checked = treeContainer.querySelectorAll('.branch-checkbox:checked');
      const count = checked.length;
      selectionInfo.textContent = `${count} rama${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''}`;
    };

    // Add event listeners to branch checkboxes
    treeContainer.querySelectorAll('.branch-checkbox').forEach(cb => {
      cb.addEventListener('change', updateBranchCount);
    });

    // Favorite tags click
    favTagsContainer.querySelectorAll('.fav-tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        tagInput.value = chip.dataset.tag;
        tagInput.focus();
      });
      chip.addEventListener('mouseenter', () => {
        chip.style.background = '#cce7f5';
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = '#e8f4fc';
      });
    });

    // Branch filter toggle
    branchFilterEnabled.addEventListener('change', () => {
      branchFilterTag.disabled = !branchFilterEnabled.checked;
      branchFilterTag.style.opacity = branchFilterEnabled.checked ? '1' : '0.5';
      if (branchFilterEnabled.checked) {
        branchFilterTag.focus();
      }
    });

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const getSelectedBranchUids = () => {
      const checked = treeContainer.querySelectorAll('.branch-checkbox:checked');
      return Array.from(checked).map(cb => cb.dataset.uid);
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ cancelled: true });
    });

    exportBtn.addEventListener('click', () => {
      if (activeTab === 'filters') {
        const tagValue = tagInput.value.trim();
        if (!tagValue) {
          tagInput.style.borderColor = '#DC143C';
          tagInput.focus();
          return;
        }
        cleanup();
        resolve({
          cancelled: false,
          mode: 'filters',
          tagName: cleanTagInput(tagValue)
        });
      } else {
        const selectedUids = getSelectedBranchUids();
        if (selectedUids.length === 0) {
          alert('Por favor selecciona al menos una rama para exportar.');
          return;
        }
        cleanup();
        resolve({
          cancelled: false,
          mode: 'branches',
          selectedUids,
          filterTag: branchFilterEnabled.checked ? cleanTagInput(branchFilterTag.value) : null
        });
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ cancelled: true });
      }
    });

    // Close on Escape, submit on Enter (for filters tab)
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ cancelled: true });
        document.removeEventListener('keydown', handleKeydown);
      }
      if (e.key === 'Enter' && activeTab === 'filters' && tagInput.value.trim()) {
        cleanup();
        resolve({
          cancelled: false,
          mode: 'filters',
          tagName: cleanTagInput(tagInput.value.trim())
        });
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Focus input on open
    tagInput.focus();
  });
};

// Main unified export function
const unifiedExport = async () => {
  try {
    // Get current page
    const pageUid = getCurrentPageUid();
    if (!pageUid) {
      showNotification('❌ Abre una página primero', '#DC143C');
      return;
    }

    // Get page name
    const pageInfo = window.roamAlphaAPI.pull('[:node/title :block/string]', [':block/uid', pageUid]);
    const pageName = pageInfo?.[':node/title'] || pageInfo?.[':block/string'] || 'Unknown Page';

    // Show unified modal (passes pageUid so modal can fetch structure with dynamic depth)
    const result = await promptUnifiedExport(pageName, pageUid);

    if (result.cancelled) {
      return;
    }

    if (result.mode === 'filters') {
      // Export by tag filter
      const tagName = result.tagName;
      if (!tagName) {
        showNotification('❌ Invalid tag name', '#DC143C');
        return;
      }

      showNotification(`🔍 Searching for #${tagName}...`, '#137CBD');

      const targetBlocks = findBlocksByTag(tagName);
      if (!targetBlocks || targetBlocks.length === 0) {
        showNotification(`❌ No blocks found with #${tagName}`, '#DC143C');
        return;
      }

      const exportTree = buildExportTree(targetBlocks);
      if (!exportTree || exportTree.length === 0) {
        showNotification('❌ Could not build export tree', '#DC143C');
        return;
      }

      const markdown = treeToMarkdown(exportTree);
      const header = generateHeader(tagName, targetBlocks.length);
      const filename = generateFilename(tagName);

      const success = downloadFile(header + markdown, filename);
      if (success) {
        showNotification(`✓ Exported ${targetBlocks.length} blocks`, '#28a745');
      }

    } else if (result.mode === 'branches') {
      // Export by branch selection - ONE FILE PER BRANCH
      const { selectedUids, filterTag } = result;

      showNotification(`📄 Procesando ${selectedUids.length} ramas...`, '#137CBD');

      // Build files array - one per selected branch
      const files = [];
      let orderPrefix = 1;

      for (const uid of selectedUids) {
        try {
          // If filter tag specified, check if this branch contains it
          if (filterTag) {
            const hasTag = window.roamAlphaAPI.data.q(`
              [:find ?match .
               :where
               [?tag :node/title "${filterTag}"]
               [?root :block/uid "${uid}"]
               (or
                 [?root :block/refs ?tag]
                 (and
                   [?descendant :block/parents ?root]
                   [?descendant :block/refs ?tag])
                 (and
                   [?descendant :block/parents ?ancestor]
                   [?ancestor :block/parents ?root]
                   [?descendant :block/refs ?tag]))
               [(identity ?root) ?match]]
            `);

            if (!hasTag) continue; // Skip branches without the tag
          }

          // Get the branch with all its descendants (NO ancestors)
          const branchTree = getBlockWithDescendants(uid);

          if (!branchTree) continue;

          // Get the root content for filename
          const rootContent = branchTree.content || 'untitled';
          const prefix = String(orderPrefix).padStart(2, '0') + '_';
          const filename = prefix + generateRootFilename(rootContent);

          // Generate markdown - tree is already in correct format
          const markdown = treeToMarkdown([branchTree]);
          const header = `# ${rootContent}\n> Generated: ${new Date().toLocaleString()}${filterTag ? `\n> Filter: #${filterTag}` : ''}\n\n---\n\n`;

          files.push({
            filename,
            content: header + markdown
          });

          orderPrefix++;
        } catch (err) {
          console.error(`Error processing branch ${uid}:`, err);
        }
      }

      if (files.length === 0) {
        const filterMsg = filterTag ? ` con tag #${filterTag}` : '';
        showNotification(`❌ No se encontró contenido${filterMsg}`, '#DC143C');
        return;
      }

      // Download based on file count
      if (files.length <= 5) {
        // Individual downloads
        for (const file of files) {
          downloadFile(file.content, file.filename);
        }
        showNotification(`✓ Exportados ${files.length} archivos`, '#28a745');
      } else {
        // ZIP download
        try {
          const JSZip = await loadJSZip();
          const zip = new JSZip();

          for (const file of files) {
            zip.file(file.filename, file.content);
          }

          const date = new Date().toISOString().split('T')[0];
          const safePageName = pageName.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
          const zipFilename = `export_${safePageName}_${date}.zip`;

          const blob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = zipFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          showNotification(`✓ Exportado ZIP con ${files.length} archivos`, '#28a745');
        } catch (err) {
          console.error('Error creating ZIP:', err);
          showNotification('❌ Error creando ZIP', '#DC143C');
        }
      }
    }

  } catch (err) {
    console.error('Error in unifiedExport:', err);
    showNotification(`❌ Error: ${err.message}`, '#DC143C');
  }
};

const promptForTag = () => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Export Filtered Content</h3>
      <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #666;">
        Enter tag to export (without #):
      </label>
      <input type="text" id="roam-filter-tag-input" 
        style="width: 100%; padding: 8px 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
        placeholder="e.g., filtrarEsto"
      />
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button id="roam-filter-cancel" 
          style="padding: 8px 16px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; cursor: pointer;">
          Cancel
        </button>
        <button id="roam-filter-export" 
          style="padding: 8px 16px; font-size: 14px; border: none; border-radius: 4px; background: #137CBD; color: white; cursor: pointer;">
          Export
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = document.getElementById('roam-filter-tag-input');
    const cancelBtn = document.getElementById('roam-filter-cancel');
    const exportBtn = document.getElementById('roam-filter-export');

    input.focus();

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const submit = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    exportBtn.addEventListener('click', submit);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });
  });
};

const exportFilteredContent = async () => {
  try {
    // Step 1: Get tag from user
    const rawInput = await promptForTag();

    if (!rawInput) {
      return; // User cancelled
    }

    // Clean input to support #tag, [[tag]], #[[tag]] formats
    const tagName = cleanTagInput(rawInput);
    if (!tagName) {
      showNotification('❌ Invalid tag name', '#DC143C');
      return;
    }

    showNotification(`🔍 Searching for #${tagName}...`, '#137CBD');

    // Step 2: Find blocks with the tag
    if (DEBUG) console.log("=== EXPORT DEBUG: Step 2 - Finding blocks ===");
    const blocks = findBlocksByTag(tagName);
    if (DEBUG) console.log("Blocks found:", blocks);

    if (blocks.length === 0) {
      showNotification(`❌ No blocks found with #${tagName}`, '#DC143C');
      return;
    }

    // Step 3: Build export tree
    if (DEBUG) console.log("=== EXPORT DEBUG: Step 3 - Building tree ===");
    const tree = buildExportTree(blocks);
    if (DEBUG) console.log("Tree built:", tree);

    if (tree.length === 0) {
      showNotification(`❌ Could not build export tree`, '#DC143C');
      return;
    }

    // Step 4: Generate Markdown
    if (DEBUG) console.log("=== EXPORT DEBUG: Step 4 - Generating Markdown ===");
    const header = generateHeader(tagName, blocks.length);
    const markdown = treeToMarkdown(tree);
    if (DEBUG) console.log("Markdown generated:", markdown);
    const content = header + markdown;

    // Step 5: Download file
    const filename = generateFilename(tagName);
    const success = downloadFile(content, filename);

    if (success) {
      showNotification(`✓ Exported ${blocks.length} blocks to ${filename}`, '#28a745');
    } else {
      showNotification(`❌ Failed to download file`, '#DC143C');
    }

  } catch (err) {
    console.error("Error in exportFilteredContent:", err);
    showNotification(`❌ Error: ${err.message}`, '#DC143C');
  }
};

// Copy filtered content to clipboard (quick copy for small amounts)
const copyFilteredContent = async () => {
  try {
    // Step 1: Get tag from user
    const rawInput = await promptForTag();

    if (!rawInput) {
      return; // User cancelled
    }

    // Clean input to support #tag, [[tag]], #[[tag]] formats
    const tagName = cleanTagInput(rawInput);
    if (!tagName) {
      showNotification('❌ Invalid tag name', '#DC143C');
      return;
    }

    showNotification(`🔍 Searching for #${tagName}...`, '#137CBD');

    // Step 2: Find blocks with the tag
    const blocks = findBlocksByTag(tagName);

    if (blocks.length === 0) {
      showNotification(`❌ No blocks found with #${tagName}`, '#DC143C');
      return;
    }

    // Step 3: Build export tree
    const tree = buildExportTree(blocks);

    if (tree.length === 0) {
      showNotification(`❌ Could not build export tree`, '#DC143C');
      return;
    }

    // Step 4: Generate Markdown (no header for clipboard)
    const markdown = treeToMarkdown(tree);

    // Step 5: Copy to clipboard
    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
      // Fallback to writeText
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdown);
        showNotification(`✓ Copied ${blocks.length} blocks to clipboard`, '#28a745');
        return;
      }
      showNotification('✗ Error: Clipboard not available', '#DC143C');
      return;
    }

    // Write both text and HTML to clipboard
    const textBlob = new Blob([markdown], { type: 'text/plain' });
    const htmlBlob = new Blob([treeToHTML(tree)], { type: 'text/html' });

    const clipboardItem = new ClipboardItem({
      'text/plain': textBlob,
      'text/html': htmlBlob
    });

    await navigator.clipboard.write([clipboardItem]);
    showNotification(`✓ Copied ${blocks.length} blocks (Text + HTML)`, '#28a745');

  } catch (err) {
    console.error("Error in copyFilteredContent:", err);
    showNotification(`❌ Error: ${err.message}`, '#DC143C');
  }
};

// ============================================
// EXPORT BY ROOT BLOCKS
// ============================================

// Prompt for root export options (with toggle, preview, and favorite tags)
const promptForRootExport = (pageName, rootCount, rootBlocks, pageUid) => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Build favorite tags HTML
    const tagsHtml = FAVORITE_TAGS.length > 0 ? `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 12px; color: #888; margin-bottom: 6px;">Favorite tags (click to use):</div>
        <div id="roam-root-tags" style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${FAVORITE_TAGS.map(tag => `
            <span class="roam-tag-chip" data-tag="${tag}" 
              style="padding: 2px 8px; font-size: 12px; background: #e3f2fd; color: #1976d2; 
                     border-radius: 12px; cursor: pointer; transition: background 0.2s;">
              #${tag}
            </span>
          `).join('')}
        </div>
      </div>
    ` : '';

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 380px;
      max-width: 450px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Export by Root Blocks</h3>
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 13px; color: #666;">Page: <strong>${pageName}</strong></div>
        <div style="font-size: 13px; color: #666;">Root blocks found: <strong>${rootCount}</strong></div>
      </div>
      
      ${tagsHtml}
      
      <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #666;">
        Filter by tag (optional):
      </label>
      <input type="text" id="roam-root-filter-input" 
        style="width: 100%; padding: 8px 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
        placeholder="e.g., textoÍntegro (leave empty for all)"
      />
      
      <div id="roam-root-preview" style="margin-top: 8px; font-size: 13px; color: #666; min-height: 20px;">
        → Will export: <strong>${rootCount}</strong> files
      </div>
      
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; cursor: pointer;">
          <input type="checkbox" id="roam-root-invert" checked style="margin: 0;">
          Invert order (01 = bottom block in Roam)
        </label>
      </div>
      
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button id="roam-root-cancel" 
          style="padding: 8px 16px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; cursor: pointer;">
          Cancel
        </button>
        <button id="roam-root-export" 
          style="padding: 8px 16px; font-size: 14px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer;">
          Export ${rootCount} files
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = document.getElementById('roam-root-filter-input');
    const cancelBtn = document.getElementById('roam-root-cancel');
    const exportBtn = document.getElementById('roam-root-export');
    const invertCheckbox = document.getElementById('roam-root-invert');
    const previewDiv = document.getElementById('roam-root-preview');
    const tagsContainer = document.getElementById('roam-root-tags');

    input.focus();

    // Debounce timer for preview updates
    let debounceTimer = null;

    const updatePreview = () => {
      const filterValue = input.value.trim();
      const cleanedTag = filterValue ? cleanTagInput(filterValue) : null;
      const matchCount = countMatchingRoots(rootBlocks, cleanedTag);

      previewDiv.innerHTML = cleanedTag
        ? `→ Will export: <strong>${matchCount}</strong> of ${rootCount} files`
        : `→ Will export: <strong>${rootCount}</strong> files`;

      exportBtn.textContent = `Export ${matchCount} files`;
    };

    // Listen for input changes with debounce
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updatePreview, 300);
    });

    // Tag chip click handlers
    if (tagsContainer) {
      tagsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.roam-tag-chip');
        if (chip) {
          input.value = chip.dataset.tag;
          updatePreview();
        }
      });
    }

    const cleanup = () => {
      clearTimeout(debounceTimer);
      document.body.removeChild(overlay);
    };

    const submit = () => {
      const filterValue = input.value.trim();
      const invertOrder = invertCheckbox.checked;
      cleanup();
      resolve({ cancelled: false, filter: filterValue || null, invertOrder });
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ cancelled: true, filter: null, invertOrder: true });
    });

    exportBtn.addEventListener('click', submit);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Escape') {
        cleanup();
        resolve({ cancelled: true, filter: null, invertOrder: true });
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ cancelled: true, filter: null, invertOrder: true });
      }
    });
  });
};

// Main export by root blocks function
const exportByRootBlocks = async () => {
  try {
    // Step 1: Get current page
    const pageUid = getCurrentPageUid();
    if (!pageUid) {
      showNotification('❌ Could not detect current page', '#DC143C');
      return;
    }

    // Get page name
    const pageInfo = window.roamAlphaAPI.pull('[:node/title :block/string]', [':block/uid', pageUid]);
    const pageName = pageInfo?.[':node/title'] || pageInfo?.[':block/string'] || 'Unknown Page';

    // Step 2: Get root blocks
    const rootBlocks = getRootBlocks(pageUid);
    if (rootBlocks.length === 0) {
      showNotification('❌ No root blocks found on this page', '#DC143C');
      return;
    }

    // Step 3: Show prompt (pass rootBlocks and pageUid for preview and tags features)
    const { cancelled, filter, invertOrder } = await promptForRootExport(pageName, rootBlocks.length, rootBlocks, pageUid);
    if (cancelled) {
      return;
    }

    const tagFilter = filter ? cleanTagInput(filter) : null;
    if (DEBUG) console.log(`Export by Root Blocks - Filter: ${tagFilter || 'none'}, Invert: ${invertOrder}`);

    showNotification(`📄 Processing ${rootBlocks.length} root blocks...`, '#137CBD');

    // Step 4: Process each root block and collect files
    const filesToExport = [];
    let skippedCount = 0;

    let orderIndex = 1; // Track order for filename prefix
    for (let i = 0; i < rootBlocks.length; i++) {
      const rootBlock = rootBlocks[i];
      const rootUid = rootBlock[':block/uid'] || rootBlock.uid;
      const rootContent = rootBlock[':block/string'] || rootBlock.string || '';

      if (!rootUid || !rootContent) {
        skippedCount++;
        continue;
      }

      // Get children (filtered if tag provided)
      const children = getFilteredChildren(rootUid, tagFilter);

      // Skip if filter is active and no matching children
      if (tagFilter && children.length === 0) {
        skippedCount++;
        continue;
      }

      // Generate markdown and filename with order prefix
      const markdown = rootBlockToMarkdown(rootContent, children);
      const baseFilename = generateRootFilename(rootContent);
      // Pad order number - invertOrder: bottom block = 01, otherwise top block = 01
      const orderNum = invertOrder ? (rootBlocks.length - orderIndex + 1) : orderIndex;
      const orderPrefix = String(orderNum).padStart(2, '0');
      const filename = `${orderPrefix}_${baseFilename}`;
      orderIndex++;

      filesToExport.push({ filename, content: markdown });
    }

    if (filesToExport.length === 0) {
      showNotification(`❌ No blocks matched the filter`, '#DC143C');
      return;
    }

    // Step 5: Export - ZIP if >5 files, individual downloads otherwise
    if (filesToExport.length > 5) {
      // Use ZIP export
      showNotification(`📦 Creating ZIP with ${filesToExport.length} files...`, '#137CBD');

      try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        // Add all files to the ZIP
        for (const file of filesToExport) {
          zip.file(file.filename, file.content);
        }

        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Generate ZIP filename
        const date = new Date().toISOString().split('T')[0];
        const safePageName = pageName.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
        const zipFilename = `export_${safePageName}_${date}.zip`;

        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);

        const filterMsg = tagFilter ? ` (filtered by #${tagFilter})` : '';
        showNotification(`✓ Exported ${filesToExport.length} files as ZIP${filterMsg}`, '#28a745');

      } catch (zipErr) {
        console.error('ZIP creation failed:', zipErr);
        showNotification(`❌ ZIP creation failed: ${zipErr.message}`, '#DC143C');
      }

    } else {
      // Individual file downloads (original behavior)
      let exportedCount = 0;

      for (let i = 0; i < filesToExport.length; i++) {
        const { filename, content } = filesToExport[i];
        const success = downloadFile(content, filename);
        if (success) {
          exportedCount++;
        }

        // Small delay between downloads to avoid browser blocking
        if (i < filesToExport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      const filterMsg = tagFilter ? ` (filtered by #${tagFilter})` : '';
      showNotification(`✓ Exported ${exportedCount} files${filterMsg}`, '#28a745');
    }

  } catch (err) {
    console.error("Error in exportByRootBlocks:", err);
    showNotification(`❌ Error: ${err.message}`, '#DC143C');
  }
};

// ============================================
// EXPORT BY BRANCH SELECTION
// ============================================

// Get page structure limited to maxDepth levels for the branch selector
const getPageStructure = (pageUid, maxDepth = 3) => {
  if (!isRoamAPIAvailable() || !pageUid) {
    return [];
  }

  try {
    const pageData = window.roamAlphaAPI.pull(
      '[:block/uid {:block/children [:block/uid :block/string :block/order {:block/children [:block/uid]}]}]',
      [':block/uid', pageUid]
    );

    if (!pageData || !pageData[':block/children']) {
      return [];
    }

    const buildStructure = (blocks, currentLevel) => {
      if (!blocks || blocks.length === 0 || currentLevel > maxDepth) {
        return [];
      }

      return blocks
        .sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0))
        .map(block => {
          const uid = block[':block/uid'];
          if (!uid) return null;

          // Fetch full block data
          const fullBlock = window.roamAlphaAPI.pull(
            '[:block/uid :block/string :block/order {:block/children [:block/uid :block/order]}]',
            [':block/uid', uid]
          );

          if (!fullBlock) return null;

          const content = fullBlock[':block/string'] || '';
          const children = fullBlock[':block/children'] || [];

          // Check if there are children beyond maxDepth
          const hasDeepChildren = currentLevel === maxDepth && children.length > 0;

          // Count total descendants for display
          let deepChildrenCount = 0;
          if (hasDeepChildren) {
            const countDescendants = (blockUid) => {
              const b = window.roamAlphaAPI.pull(
                '[{:block/children [:block/uid]}]',
                [':block/uid', blockUid]
              );
              const c = b?.[':block/children'] || [];
              return c.length + c.reduce((sum, child) => sum + countDescendants(child[':block/uid']), 0);
            };
            deepChildrenCount = children.length + children.reduce((sum, c) => sum + countDescendants(c[':block/uid']), 0);
          }

          return {
            uid,
            content: content.length > 60 ? content.substring(0, 57) + '...' : content,
            fullContent: content,
            level: currentLevel,
            hasDeepChildren,
            deepChildrenCount,
            children: currentLevel < maxDepth ? buildStructure(children, currentLevel + 1) : []
          };
        })
        .filter(Boolean);
    };

    return buildStructure(pageData[':block/children'], 1);
  } catch (err) {
    console.error('Error in getPageStructure:', err);
    return [];
  }
};

// Fetch blocks with their parents for export (format compatible with buildExportTree)
const fetchBlocksForExport = (selectedUids, filterTag = null) => {
  if (!selectedUids || selectedUids.length === 0) {
    return [];
  }

  const blocks = [];

  for (const uid of selectedUids) {
    try {
      // Get block with parents
      const result = window.roamAlphaAPI.data.q(`
        [:find (pull ?block [:block/uid :block/string :block/order
                             {:block/parents [:block/uid :block/string :block/order]}])
         :where
         [?block :block/uid "${uid}"]]
      `);

      if (result && result.length > 0 && result[0][0]) {
        const block = result[0][0];

        // If filter tag is specified, check if this block or its descendants contain it
        if (filterTag) {
          const hasTag = window.roamAlphaAPI.data.q(`
            [:find ?match .
             :where
             [?tag :node/title "${filterTag}"]
             [?root :block/uid "${uid}"]
             (or
               [?root :block/refs ?tag]
               (and
                 [?descendant :block/parents ?root]
                 [?descendant :block/refs ?tag])
               (and
                 [?descendant :block/parents ?ancestor]
                 [?ancestor :block/parents ?root]
                 [?descendant :block/refs ?tag]))
             [(identity ?root) ?match]]
          `);

          if (!hasTag) continue; // Skip blocks without the tag
        }

        blocks.push(block);
      }
    } catch (err) {
      console.error(`Error fetching block ${uid}:`, err);
    }
  }

  return blocks;
};

// Prompt for branch selection with visual tree
const promptForBranchSelection = (pageName, structure) => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 500px;
      max-width: 700px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    `;

    // Render tree structure with checkboxes
    const renderTree = (nodes, indentLevel = 0) => {
      return nodes.map(node => {
        const indent = indentLevel * 20;
        const deepInfo = node.hasDeepChildren ? ` <span style="color: #888; font-size: 11px;">(+${node.deepChildrenCount} sub-bloques)</span>` : '';
        return `
          <div style="padding: 4px 0; padding-left: ${indent}px;">
            <label style="display: flex; align-items: flex-start; cursor: pointer; gap: 8px;">
              <input type="checkbox" data-uid="${node.uid}" style="margin-top: 3px; cursor: pointer;">
              <span style="font-size: 13px; line-height: 1.4;" title="${node.fullContent.replace(/"/g, '&quot;')}">${node.content}${deepInfo}</span>
            </label>
            ${node.children && node.children.length > 0 ? renderTree(node.children, indentLevel + 1) : ''}
          </div>
        `;
      }).join('');
    };

    modal.innerHTML = `
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
        📂 Seleccionar ramas para exportar
      </h3>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #666;">
        Página: <strong>${pageName}</strong>
      </p>
      
      <div id="branch-tree-container" style="
        flex: 1;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 16px;
        max-height: 400px;
        background: #fafafa;
      ">
        ${structure.length > 0 ? renderTree(structure) : '<p style="color: #888;">No hay bloques en esta página</p>'}
      </div>
      
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
          <input type="checkbox" id="branch-filter-enabled">
          <span>Filtrar por tag (opcional):</span>
        </label>
        <input type="text" id="branch-filter-tag" 
          style="width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-top: 8px; opacity: 0.5;"
          placeholder="Ej: #resumen, [[concepto]], etc."
          disabled
        />
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span id="branch-selection-count" style="font-size: 13px; color: #666;">0 ramas seleccionadas</span>
        <div style="display: flex; gap: 8px;">
          <button id="branch-cancel" 
            style="padding: 8px 16px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; cursor: pointer;">
            Cancelar
          </button>
          <button id="branch-export" 
            style="padding: 8px 16px; font-size: 14px; border: none; border-radius: 4px; background: #137CBD; color: white; cursor: pointer;">
            Exportar
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Get elements
    const cancelBtn = document.getElementById('branch-cancel');
    const exportBtn = document.getElementById('branch-export');
    const filterEnabled = document.getElementById('branch-filter-enabled');
    const filterTag = document.getElementById('branch-filter-tag');
    const selectionCount = document.getElementById('branch-selection-count');
    const treeContainer = document.getElementById('branch-tree-container');

    // Update selection count
    const updateCount = () => {
      const checked = treeContainer.querySelectorAll('input[type="checkbox"]:checked');
      const count = checked.length;
      selectionCount.textContent = `${count} rama${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''}`;
    };

    // Add event listeners to checkboxes
    treeContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateCount);
    });

    // Filter toggle
    filterEnabled.addEventListener('change', () => {
      filterTag.disabled = !filterEnabled.checked;
      filterTag.style.opacity = filterEnabled.checked ? '1' : '0.5';
      if (filterEnabled.checked) {
        filterTag.focus();
      }
    });

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const getSelectedUids = () => {
      const checked = treeContainer.querySelectorAll('input[type="checkbox"]:checked');
      return Array.from(checked).map(cb => cb.dataset.uid);
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ cancelled: true });
    });

    exportBtn.addEventListener('click', () => {
      const selectedUids = getSelectedUids();
      if (selectedUids.length === 0) {
        alert('Por favor selecciona al menos una rama para exportar.');
        return;
      }
      cleanup();
      resolve({
        cancelled: false,
        selectedUids,
        filterTag: filterEnabled.checked ? cleanTagInput(filterTag.value) : null
      });
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ cancelled: true });
      }
    });

    // Close on Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
};

// Main export by branch selection function
const exportByBranchSelection = async () => {
  try {
    // Step 1: Get current page
    const pageUid = getCurrentPageUid();
    if (!pageUid) {
      showNotification('❌ Could not detect current page', '#DC143C');
      return;
    }

    // Get page name
    const pageInfo = window.roamAlphaAPI.pull('[:node/title :block/string]', [':block/uid', pageUid]);
    const pageName = pageInfo?.[':node/title'] || pageInfo?.[':block/string'] || 'Unknown Page';

    // Step 2: Get page structure (limited to 3 levels)
    showNotification('📊 Loading page structure...', '#137CBD');
    const structure = getPageStructure(pageUid, 3);

    if (structure.length === 0) {
      showNotification('❌ No blocks found on this page', '#DC143C');
      return;
    }

    // Step 3: Show branch selection modal
    const { cancelled, selectedUids, filterTag } = await promptForBranchSelection(pageName, structure);

    if (cancelled) {
      return;
    }

    showNotification(`📄 Processing ${selectedUids.length} selected branches...`, '#137CBD');

    // Step 4: Fetch blocks with parents (optionally filtered)
    const blocks = fetchBlocksForExport(selectedUids, filterTag);

    if (blocks.length === 0) {
      const filterMsg = filterTag ? ` with tag #${filterTag}` : '';
      showNotification(`❌ No content found${filterMsg}`, '#DC143C');
      return;
    }

    // Step 5: Build export tree and convert to markdown
    const exportTree = buildExportTree(blocks);

    if (!exportTree || exportTree.length === 0) {
      showNotification('❌ Could not build export tree', '#DC143C');
      return;
    }

    const markdown = treeToMarkdown(exportTree);

    // Step 6: Generate filename and download
    const date = new Date().toISOString().split('T')[0];
    const safePageName = pageName.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
    const filterSuffix = filterTag ? `_${filterTag.replace(/[\/\\:*?"<>|]/g, '_')}` : '';
    const filename = `branches_${safePageName}${filterSuffix}_${date}.md`;

    const header = `# Export: ${pageName}\n> Generated: ${new Date().toLocaleString()}\n> Branches: ${selectedUids.length}${filterTag ? `\n> Filter: #${filterTag}` : ''}\n\n---\n\n`;

    const success = downloadFile(header + markdown, filename);

    if (success) {
      const filterMsg = filterTag ? ` (filtered by #${filterTag})` : '';
      showNotification(`✓ Exported ${selectedUids.length} branches${filterMsg}`, '#28a745');
    }

  } catch (err) {
    console.error('Error in exportByBranchSelection:', err);
    showNotification(`❌ Error: ${err.message}`, '#DC143C');
  }
};

// Convert tree to HTML for rich pasting
const treeToHTML = (trees, indentLevel = 0) => {
  if (!trees || trees.length === 0) {
    return "";
  }

  let html = "<ul>";
  for (const node of trees) {
    html += `<li>${node.content}`;
    if (node.children && node.children.length > 0) {
      html += treeToHTML(node.children, indentLevel + 1);
    }
    html += "</li>";
  }
  html += "</ul>";
  return html;
};

// ============================================
// VISUAL SELECTION COPY (Alt+Shift+C)
// ============================================

// Performance optimization: Cache for descendants during copy operation
let descendantsCache = null;
let blockInfoCache = null;

// Helper to get block info with caching
const getBlockInfoCached = (blockUid, query) => {
  if (!blockInfoCache) return null;

  const cacheKey = `${blockUid}:${query}`;
  if (blockInfoCache.has(cacheKey)) {
    return blockInfoCache.get(cacheKey);
  }

  const blockInfo = window.roamAlphaAPI.pull(query, [":block/uid", blockUid]);
  blockInfoCache.set(cacheKey, blockInfo);
  return blockInfo;
};

// Helper to recursively build a tree of block nodes for visual copy
const getVisualBlockTree = (blockUid) => {
  if (!blockUid) return null;

  try {
    const blockInfo = getBlockInfoCached(
      blockUid,
      "[:block/string {:block/children [:block/uid :block/order]}]"
    );

    if (!blockInfo) return null;

    const node = {
      content: blockInfo[":block/string"] || "",
      children: []
    };

    if (blockInfo[":block/children"]) {
      const children = blockInfo[":block/children"];
      const sortedChildren = children.sort((a, b) => {
        return (a[":block/order"] || 0) - (b[":block/order"] || 0);
      });

      sortedChildren.forEach(child => {
        const childUid = child[":block/uid"];
        if (childUid) {
          const childNode = getVisualBlockTree(childUid);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });
    }

    return node;
  } catch (err) {
    console.error("Error in getVisualBlockTree:", err);
    return null;
  }
};

const getBlockUidFromElement = (container) => {
  try {
    if (!container) return null;
    const blockElement = container.querySelector('[id^="block-input-"]');
    if (blockElement) {
      const id = blockElement.id;
      const parts = id.split('-');
      return parts[parts.length - 1];
    }
  } catch (err) {
    console.error("Error in getBlockUidFromElement:", err);
  }
  return null;
};

const isDescendantOf = (childContainer, potentialAncestorContainer) => {
  try {
    if (!childContainer || !potentialAncestorContainer) return false;
    let current = childContainer.parentElement;
    while (current) {
      if (current === potentialAncestorContainer) return true;
      current = current.parentElement;
    }
  } catch (err) {
    console.error("Error in isDescendantOf:", err);
  }
  return false;
};

// Recursively find all descendant UIDs of a block
const getAllDescendantUids = (blockUid) => {
  if (!blockUid) return [];

  if (descendantsCache && descendantsCache.has(blockUid)) {
    return descendantsCache.get(blockUid);
  }

  const descendants = [];
  try {
    const blockInfo = getBlockInfoCached(blockUid, "[:block/uid {:block/children ...}]");
    if (blockInfo && blockInfo[":block/children"]) {
      blockInfo[":block/children"].forEach(child => {
        const childUid = child[":block/uid"];
        if (childUid) {
          descendants.push(childUid);
          descendants.push(...getAllDescendantUids(childUid));
        }
      });
    }
  } catch (err) {
    console.error("Error in getAllDescendantUids:", err);
  }

  if (descendantsCache) {
    descendantsCache.set(blockUid, descendants);
  }
  return descendants;
};

const findSelectedDescendants = (blockUid, selectedUids) => {
  const allDescendants = getAllDescendantUids(blockUid);
  return allDescendants.filter(uid => selectedUids.has(uid));
};

// Build selective path tree for visual copy
const buildVisualPathTree = (parentUid, targetUids) => {
  if (!parentUid || targetUids.size === 0) return null;

  try {
    const blockInfo = getBlockInfoCached(
      parentUid,
      "[:block/string {:block/children [:block/uid :block/order]}]"
    );

    if (!blockInfo) return null;

    const node = {
      content: blockInfo[":block/string"] || "",
      children: []
    };

    const isTarget = targetUids.has(parentUid);
    const descendants = getAllDescendantUids(parentUid);
    const hasTargetDescendants = descendants.some(desc => targetUids.has(desc));

    if (isTarget && !hasTargetDescendants) {
      // Leaf target - copy all children
      if (blockInfo[":block/children"]) {
        const sortedChildren = blockInfo[":block/children"].sort((a, b) => {
          return (a[":block/order"] || 0) - (b[":block/order"] || 0);
        });
        sortedChildren.forEach(child => {
          const childUid = child[":block/uid"];
          if (childUid) {
            const childNode = getVisualBlockTree(childUid);
            if (childNode) node.children.push(childNode);
          }
        });
      }
    } else {
      // Only process children on path to targets
      if (blockInfo[":block/children"]) {
        const sortedChildren = blockInfo[":block/children"].sort((a, b) => {
          return (a[":block/order"] || 0) - (b[":block/order"] || 0);
        });
        sortedChildren.forEach(child => {
          const childUid = child[":block/uid"];
          if (childUid) {
            const childDescendants = getAllDescendantUids(childUid);
            const hasTargetInBranch = targetUids.has(childUid) ||
              childDescendants.some(desc => targetUids.has(desc));
            if (hasTargetInBranch) {
              const childNode = buildVisualPathTree(childUid, targetUids);
              if (childNode) node.children.push(childNode);
            }
          }
        });
      }
    }

    return node;
  } catch (err) {
    console.error("Error in buildVisualPathTree:", err);
    return null;
  }
};

// Visual tree to Markdown
const visualTreeToMarkdown = (nodes, indentLevel = 0) => {
  let lines = [];
  const indent = '  '.repeat(indentLevel);

  nodes.forEach(node => {
    lines.push(`${indent}- ${node.content}`);
    if (node.children && node.children.length > 0) {
      lines.push(...visualTreeToMarkdown(node.children, indentLevel + 1));
    }
  });

  return lines;
};

// Visual tree to HTML
const visualTreeToHTML = (nodes) => {
  if (!nodes || nodes.length === 0) return '';
  let html = '<ul>';
  nodes.forEach(node => {
    let content = node.content
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\_\_(.*?)\_\_/g, '<i>$1</i>')
      .replace(/\^\^(.*?)\^\^/g, '<mark>$1</mark>');
    html += `<li>${content}`;
    if (node.children && node.children.length > 0) {
      html += visualTreeToHTML(node.children);
    }
    html += '</li>';
  });
  html += '</ul>';
  return html;
};

// Main copy function for visual selection (Alt+Shift+C)
const copyVisibleBlocks = (event) => {
  event.preventDefault();
  event.stopPropagation();

  descendantsCache = new Map();
  blockInfoCache = new Map();

  try {
    const selectedContainers = Array.from(document.querySelectorAll('.block-highlight-blue'));

    if (selectedContainers.length === 0) {
      return;
    }

    const selectedUids = new Set();
    selectedContainers.forEach(container => {
      const uid = getBlockUidFromElement(container);
      if (uid) selectedUids.add(uid);
    });

    const topLevelContainers = selectedContainers.filter(container => {
      return !selectedContainers.some(otherContainer =>
        otherContainer !== container && isDescendantOf(container, otherContainer)
      );
    });

    let allNodes = [];

    topLevelContainers.forEach(container => {
      const blockUid = getBlockUidFromElement(container);
      if (!blockUid) return;

      const selectedDescendantUids = findSelectedDescendants(blockUid, selectedUids);

      if (selectedDescendantUids.length > 0) {
        const leafTargets = selectedDescendantUids.filter(uid => {
          const descendants = getAllDescendantUids(uid);
          return !descendants.some(desc => selectedUids.has(desc));
        });
        const targetUidsSet = new Set(leafTargets);
        const node = buildVisualPathTree(blockUid, targetUidsSet);
        if (node) allNodes.push(node);
      } else {
        const node = getVisualBlockTree(blockUid);
        if (node) allNodes.push(node);
      }
    });

    const markdownLines = visualTreeToMarkdown(allNodes);
    const textContent = markdownLines.join('\n');
    const htmlContent = visualTreeToHTML(allNodes);

    if (textContent) {
      if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textContent)
            .then(() => showNotification('✓ Copied (Text only)', '#137CBD'))
            .catch(() => showNotification('✗ Copy failed', '#DC143C'));
          return;
        }
        showNotification('✗ Clipboard not available', '#DC143C');
        return;
      }

      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/plain': textBlob, 'text/html': htmlBlob });

      navigator.clipboard.write([clipboardItem])
        .then(() => showNotification('✓ Copied (Text + HTML)', '#137CBD'))
        .catch(() => {
          navigator.clipboard.writeText(textContent)
            .then(() => showNotification('✓ Copied (Text only)', '#137CBD'));
        });
    }
  } finally {
    descendantsCache = null;
    blockInfoCache = null;
  }
};

// Keyboard shortcut handler
const handleKeyDown = (event) => {
  if (event.altKey && event.shiftKey && event.key === 'C') {
    copyVisibleBlocks(event);
  }
};

// ============================================
// EXTENSION INITIALIZATION
// ============================================

const initExtension = () => {
  // Add keyboard shortcut for visual selection copy
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);

  // Register commands in Command Palette
  if (window.roamAlphaAPI?.ui?.commandPalette) {
    // Main unified export command (with tabs)
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Smart Export",
      callback: unifiedExport,
      "disable-hotkey": false
    });

    // Visual selection copy (keep separate - different functionality)
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Smart Copy Selected Blocks",
      callback: () => {
        const fakeEvent = { preventDefault: () => { }, stopPropagation: () => { } };
        copyVisibleBlocks(fakeEvent);
      },
      "disable-hotkey": false
    });

    // Export by root blocks (keep for now - different output format)
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Export by Root Blocks",
      callback: exportByRootBlocks,
      "disable-hotkey": false
    });
  }

  console.log("Roam Filter Export extension loaded (v2.10.0)");
};

const cleanupExtension = () => {
  document.removeEventListener('keydown', handleKeyDown);

  if (window.roamAlphaAPI?.ui?.commandPalette) {
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Smart Export" });
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Smart Copy Selected Blocks" });
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Export by Root Blocks" });
  }

  console.log("Roam Filter Export extension unloaded");
};

// Make cleanup available globally
if (typeof window !== 'undefined') {
  window.roamExportFilterCleanup = cleanupExtension;
}

// Initialize
initExtension();