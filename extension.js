// Roam Filter Copy - Smart Copy for Filtered Blocks
// Created by Camilo Luvino
// https://github.com/camiloluvino/roamFilter
//
// Intelligent copying for filtered content:
// - If a block has selected descendants: Copies ONLY paths to those descendants
// - If a block has no selected descendants: Copies the block with ALL its children
// Use case: Filter by tags → Select visible blocks → Alt+Shift+C → Paste filtered hierarchy

// Performance optimization: Enable debug logging
const DEBUG = false;

// Performance optimization: Cache for descendants during copy operation
let descendantsCache = null;
let blockInfoCache = null;

// Check if Roam API is available
const isRoamAPIAvailable = () => {
  return typeof window !== 'undefined' &&
    window.roamAlphaAPI &&
    typeof window.roamAlphaAPI.pull === 'function';
};

// Helper to get block info with caching
const getBlockInfo = (blockUid, query) => {
  if (!blockInfoCache) return null;

  const cacheKey = `${blockUid}:${query}`;
  if (blockInfoCache.has(cacheKey)) {
    return blockInfoCache.get(cacheKey);
  }

  const blockInfo = window.roamAlphaAPI.pull(query, [":block/uid", blockUid]);
  blockInfoCache.set(cacheKey, blockInfo);
  return blockInfo;
};

// Helper to recursively build a tree of block nodes
const getBlockTree = (blockUid) => {
  if (!blockUid) {
    if (DEBUG) console.warn("getBlockTree called with empty blockUid");
    return null;
  }

  if (!isRoamAPIAvailable()) {
    console.error("Roam API is not available");
    return null;
  }

  try {
    const blockInfo = getBlockInfo(
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
          const childNode = getBlockTree(childUid);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });
    }

    return node;
  } catch (err) {
    console.error("Error in getBlockTree:", err);
    return null;
  }
};

const getBlockUidFromElement = (container) => {
  try {
    if (!container) {
      if (DEBUG) console.warn("getBlockUidFromElement called with null container");
      return null;
    }

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
    if (!childContainer || !potentialAncestorContainer) {
      return false;
    }

    let current = childContainer.parentElement;
    while (current) {
      if (current === potentialAncestorContainer) {
        return true;
      }
      current = current.parentElement;
    }
  } catch (err) {
    console.error("Error in isDescendantOf:", err);
  }
  return false;
};

// Recursively find all descendant UIDs of a block using Roam API
// Performance optimization: Uses memoization cache
const getAllDescendantUids = (blockUid) => {
  if (!isRoamAPIAvailable() || !blockUid) {
    return [];
  }

  // Check cache first
  if (descendantsCache && descendantsCache.has(blockUid)) {
    return descendantsCache.get(blockUid);
  }

  const descendants = [];

  try {
    const blockInfo = getBlockInfo(blockUid, "[:block/uid {:block/children ...}]");

    if (blockInfo && blockInfo[":block/children"]) {
      const children = blockInfo[":block/children"];
      children.forEach(child => {
        const childUid = child[":block/uid"];
        if (childUid) {
          descendants.push(childUid);
          // Recursively get descendants of this child
          const childDescendants = getAllDescendantUids(childUid);
          descendants.push(...childDescendants);
        }
      });
    }
  } catch (err) {
    console.error("Error in getAllDescendantUids:", err);
  }

  // Store in cache
  if (descendantsCache) {
    descendantsCache.set(blockUid, descendants);
  }

  return descendants;
};

// Find which descendants of a block are selected (by checking against selected UIDs)
const findSelectedDescendants = (blockUid, selectedUids) => {
  const allDescendants = getAllDescendantUids(blockUid);
  return allDescendants.filter(uid => selectedUids.has(uid));
};

// Build a tree of nodes for selected descendants path
const buildPathTree = (parentUid, targetUids) => {
  if (!isRoamAPIAvailable() || !parentUid || targetUids.size === 0) {
    return null;
  }

  try {
    const blockInfo = getBlockInfo(
      parentUid,
      "[:block/string {:block/children [:block/uid :block/order]}]"
    );

    if (!blockInfo) return null;

    const node = {
      content: blockInfo[":block/string"] || "",
      children: []
    };

    // Check if this block is a target (selected descendant)
    const isTarget = targetUids.has(parentUid);

    // Check if any of its descendants are also targets (using cached descendants)
    const descendants = getAllDescendantUids(parentUid);
    const hasTargetDescendants = descendants.some(desc => targetUids.has(desc));

    if (isTarget && !hasTargetDescendants) {
      // This is a LEAF target (no selected descendants) - copy ALL its children
      if (DEBUG) console.log(`Block ${parentUid} is a leaf target - copying all children`);
      if (blockInfo[":block/children"]) {
        const children = blockInfo[":block/children"];
        const sortedChildren = children.sort((a, b) => {
          return (a[":block/order"] || 0) - (b[":block/order"] || 0);
        });

        sortedChildren.forEach(child => {
          const childUid = child[":block/uid"];
          if (childUid) {
            const childNode = getBlockTree(childUid);
            if (childNode) {
              node.children.push(childNode);
            }
          }
        });
      }
    } else {
      // Either not a target, or is a target with selected descendants
      // Only process children that are on the path to targets
      if (blockInfo[":block/children"]) {
        const children = blockInfo[":block/children"];
        const sortedChildren = children.sort((a, b) => {
          return (a[":block/order"] || 0) - (b[":block/order"] || 0);
        });

        sortedChildren.forEach(child => {
          const childUid = child[":block/uid"];
          if (childUid) {
            // Check if this child or its descendants contain any targets
            const childDescendants = getAllDescendantUids(childUid);
            const hasTargetInBranch = targetUids.has(childUid) ||
              childDescendants.some(desc => targetUids.has(desc));

            if (hasTargetInBranch) {
              // Recursively build path through this child
              const childNode = buildPathTree(childUid, targetUids);
              if (childNode) {
                node.children.push(childNode);
              }
            }
          }
        });
      }
    }

    return node;
  } catch (err) {
    console.error("Error in buildPathTree:", err);
    return null;
  }
};

// Convert tree to Markdown text
const treeToMarkdown = (nodes, indentLevel = 0) => {
  let lines = [];
  const indent = '  '.repeat(indentLevel);

  nodes.forEach(node => {
    lines.push(`${indent}- ${node.content}`);
    if (node.children && node.children.length > 0) {
      lines.push(...treeToMarkdown(node.children, indentLevel + 1));
    }
  });

  return lines;
};

// Convert tree to HTML
const treeToHTML = (nodes) => {
  if (!nodes || nodes.length === 0) return '';

  let html = '<ul>';
  nodes.forEach(node => {
    // Convert Roam formatting to HTML (basic)
    let content = node.content
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\_\_(.*?)\_\_/g, '<i>$1</i>')
      .replace(/\^\^(.*?)\^\^/g, '<mark>$1</mark>');

    html += `<li>${content}`;
    if (node.children && node.children.length > 0) {
      html += treeToHTML(node.children);
    }
    html += '</li>';
  });
  html += '</ul>';
  return html;
};

const copyVisibleBlocks = (event) => {
  event.preventDefault();
  event.stopPropagation();

  // Performance optimization: Initialize caches for this copy operation
  descendantsCache = new Map();
  blockInfoCache = new Map();

  try {
    const selectedContainers = Array.from(document.querySelectorAll('.block-highlight-blue'));

    if (selectedContainers.length === 0) {
      return;
    }

    // Extract all selected UIDs for checking descendants
    const selectedUids = new Set();
    selectedContainers.forEach(container => {
      const uid = getBlockUidFromElement(container);
      if (uid) {
        selectedUids.add(uid);
      }
    });

    // Filter to get only top-level selected blocks (no ancestors selected)
    const topLevelContainers = selectedContainers.filter(container => {
      return !selectedContainers.some(otherContainer =>
        otherContainer !== container && isDescendantOf(container, otherContainer)
      );
    });

    let allNodes = [];

    // Process each top-level block
    const processContainer = (container) => {
      const blockUid = getBlockUidFromElement(container);
      if (!blockUid) return;

      // Check if this block has descendants that are also selected
      const selectedDescendantUids = findSelectedDescendants(blockUid, selectedUids);

      if (selectedDescendantUids.length > 0) {
        // Has selected descendants - filter to get only LEAF targets
        // (selected blocks that don't have other selected descendants)
        const leafTargets = selectedDescendantUids.filter(uid => {
          const descendants = getAllDescendantUids(uid);
          const hasSelectedDescendants = descendants.some(desc => selectedUids.has(desc));
          return !hasSelectedDescendants;
        });

        if (DEBUG) {
          console.log(`Block ${blockUid} has ${selectedDescendantUids.length} selected descendants, ${leafTargets.length} are leaf targets - building selective paths`);
        }

        const targetUidsSet = new Set(leafTargets);
        const node = buildPathTree(blockUid, targetUidsSet);
        if (node) allNodes.push(node);
      } else {
        // No selected descendants - copy entire block with ALL children
        if (DEBUG) console.log(`Block ${blockUid} has no selected descendants - copying all children`);
        const node = getBlockTree(blockUid);
        if (node) allNodes.push(node);
      }
    };

    // Process each top-level container
    topLevelContainers.forEach((container) => {
      processContainer(container);
    });

    // Convert to Markdown (Text)
    const markdownLines = treeToMarkdown(allNodes);
    const textContent = markdownLines.join('\n');

    // Convert to HTML
    const htmlContent = treeToHTML(allNodes);

    if (textContent) {
      // Check if clipboard API is available
      if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
        // Fallback to writeText if write() is not available (older browsers)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textContent)
            .then(() => showNotification('✓ Copied (Text only)', '#137CBD'))
            .catch(err => {
              console.error("Failed to copy:", err);
              showNotification('✗ Copy failed', '#DC143C');
            });
          return;
        }
        console.error("Clipboard API is not available");
        showNotification('✗ Error: Clipboard not available', '#DC143C');
        return;
      }

      // Write both formats to clipboard
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });

      const clipboardItem = new ClipboardItem({
        'text/plain': textBlob,
        'text/html': htmlBlob
      });

      navigator.clipboard.write([clipboardItem])
        .then(() => {
          showNotification('✓ Copied (Text + HTML)', '#137CBD');
        })
        .catch((err) => {
          console.error("Failed to copy to clipboard:", err);
          // Fallback to text only if rich copy fails
          navigator.clipboard.writeText(textContent)
            .then(() => showNotification('✓ Copied (Text only)', '#137CBD'));
        });
    }
  } finally {
    // Performance optimization: Clear caches after operation completes
    descendantsCache = null;
    blockInfoCache = null;
  }
};

// Helper function to show notifications
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
    setTimeout(() => notification.remove(), 1500);
  } catch (err) {
    console.error("Error showing notification:", err);
  }
};

const handleKeyDown = (event) => {
  if (event.altKey && event.shiftKey && event.key === 'C') {
    copyVisibleBlocks(event);
  }
};

// Initialize the extension
const initExtension = () => {
  // Remove existing listener if any (prevents duplicates)
  document.removeEventListener('keydown', handleKeyDown);
  // Add the event listener
  document.addEventListener('keydown', handleKeyDown);

  // Register command in Roam Command Palette
  if (window.roamAlphaAPI && window.roamAlphaAPI.ui && window.roamAlphaAPI.ui.commandPalette) {
    window.roamAlphaAPI.ui.commandPalette.addCommand({
      label: "Smart Copy Filtered Blocks (Roam Filter)",
      callback: () => {
        // Create a fake event object since the function expects one
        const fakeEvent = {
          preventDefault: () => { },
          stopPropagation: () => { }
        };
        copyVisibleBlocks(fakeEvent);
      },
      "disable-hotkey": false // Allow users to set their own hotkey
    });
  }

  console.log("Roam Filter Copy extension loaded");
};

// Cleanup function to remove event listener
const cleanupExtension = () => {
  document.removeEventListener('keydown', handleKeyDown);

  // Remove command from palette
  if (window.roamAlphaAPI && window.roamAlphaAPI.ui && window.roamAlphaAPI.ui.commandPalette) {
    window.roamAlphaAPI.ui.commandPalette.removeCommand({
      label: "Smart Copy Filtered Blocks (Roam Filter)"
    });
  }

  console.log("Roam Filter Copy extension unloaded");
};

// Make cleanup available globally for manual cleanup if needed
if (typeof window !== 'undefined') {
  window.roamFilterCopyCleanup = cleanupExtension;
}

// Initialize the extension
initExtension();