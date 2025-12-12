// Roam Filter Export - Smart Export for Filtered Blocks
// Version: 2.5.1
// Date: 2025-12-12
//
// Created by Camilo Luvino
// https://github.com/camiloluvino/roamFilter
//
// Exports content filtered by tags using Datalog queries.
// Works even when blocks are collapsed (unlike DOM-based approaches).

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

// --- tree-builder.js ---
const DEBUG = true; // Set to false in production

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
    // Export to file (by tag)
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Export Filtered Content",
      callback: exportFilteredContent,
      "disable-hotkey": false
    });

    // Copy to clipboard (by tag)
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Copy Filtered Content",
      callback: copyFilteredContent,
      "disable-hotkey": false
    });

    // Visual selection copy
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Smart Copy Selected Blocks",
      callback: () => {
        const fakeEvent = { preventDefault: () => { }, stopPropagation: () => { } };
        copyVisibleBlocks(fakeEvent);
      },
      "disable-hotkey": false
    });
  }

  console.log("Roam Filter Export extension loaded");
};

const cleanupExtension = () => {
  document.removeEventListener('keydown', handleKeyDown);

  if (window.roamAlphaAPI?.ui?.commandPalette) {
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Export Filtered Content" });
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Copy Filtered Content" });
    window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: "Smart Copy Selected Blocks" });
  }

  console.log("Roam Filter Export extension unloaded");
};

// Make cleanup available globally
if (typeof window !== 'undefined') {
  window.roamFilterExportCleanup = cleanupExtension;
}

// Initialize
initExtension();