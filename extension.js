// Roam Filter Copy - Smart Copy for Filtered Blocks
// Created by Camilo Luvino
// https://github.com/camiloluvino/roamFilter
//
// Intelligent copying for filtered content:
// - If a block has selected descendants: Copies ONLY paths to those descendants
// - If a block has no selected descendants: Copies the block with ALL its children
// Use case: Filter by tags → Select visible blocks → Alt+Shift+C → Paste filtered hierarchy

// Check if Roam API is available
const isRoamAPIAvailable = () => {
  return typeof window !== 'undefined' &&
         window.roamAlphaAPI &&
         typeof window.roamAlphaAPI.pull === 'function';
};

const getBlockChildren = (blockUid, currentIndent) => {
  const lines = [];

  if (!blockUid) {
    console.warn("getBlockChildren called with empty blockUid");
    return lines;
  }

  if (!isRoamAPIAvailable()) {
    console.error("Roam API is not available");
    return lines;
  }

  try {
    const blockInfo = window.roamAlphaAPI.pull(
      "[:block/string {:block/children [:block/uid :block/order]}]",
      [":block/uid", blockUid]
    );
    
    if (blockInfo && blockInfo[":block/string"]) {
      const content = blockInfo[":block/string"];
      const indent = '  '.repeat(currentIndent);
      lines.push(`${indent}- ${content}`);
    }
    
    if (blockInfo && blockInfo[":block/children"]) {
      const children = blockInfo[":block/children"];
      const sortedChildren = children.sort((a, b) => {
        return (a[":block/order"] || 0) - (b[":block/order"] || 0);
      });
      
      sortedChildren.forEach(child => {
        const childUid = child[":block/uid"];
        if (childUid) {
          const childLines = getBlockChildren(childUid, currentIndent + 1);
          lines.push(...childLines);
        }
      });
    }
  } catch (err) {
    console.error("Error in getBlockChildren:", err);
  }
  
  return lines;
};

const getBlockUidFromElement = (container) => {
  try {
    if (!container) {
      console.warn("getBlockUidFromElement called with null container");
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
const getAllDescendantUids = (blockUid) => {
  const descendants = [];

  if (!isRoamAPIAvailable() || !blockUid) {
    return descendants;
  }

  try {
    const blockInfo = window.roamAlphaAPI.pull(
      "[:block/uid {:block/children ...}]",
      [":block/uid", blockUid]
    );

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

  return descendants;
};

// Find which descendants of a block are selected (by checking against selected UIDs)
const findSelectedDescendants = (blockUid, selectedUids) => {
  const allDescendants = getAllDescendantUids(blockUid);
  return allDescendants.filter(uid => selectedUids.has(uid));
};

// Build a map of UID to path - for each selected descendant, build the path from parent to it
const buildPathToDescendants = (parentUid, targetUids, currentIndent) => {
  const lines = [];

  if (!isRoamAPIAvailable() || !parentUid || targetUids.size === 0) {
    return lines;
  }

  try {
    const blockInfo = window.roamAlphaAPI.pull(
      "[:block/string {:block/children [:block/uid :block/order]}]",
      [":block/uid", parentUid]
    );

    if (!blockInfo) return lines;

    // Add parent block text
    if (blockInfo[":block/string"]) {
      const content = blockInfo[":block/string"];
      const indent = '  '.repeat(currentIndent);
      lines.push(`${indent}- ${content}`);
    }

    // Check if this block is a target (selected descendant)
    const isTarget = targetUids.has(parentUid);

    if (isTarget) {
      // This is a selected descendant - copy all its children
      if (blockInfo[":block/children"]) {
        const children = blockInfo[":block/children"];
        const sortedChildren = children.sort((a, b) => {
          return (a[":block/order"] || 0) - (b[":block/order"] || 0);
        });

        sortedChildren.forEach(child => {
          const childUid = child[":block/uid"];
          if (childUid) {
            const childLines = getBlockChildren(childUid, currentIndent + 1);
            lines.push(...childLines);
          }
        });
      }
    } else {
      // Not a target - check if any children are on the path to targets
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
              const childLines = buildPathToDescendants(childUid, targetUids, currentIndent + 1);
              lines.push(...childLines);
            }
          }
        });
      }
    }
  } catch (err) {
    console.error("Error in buildPathToDescendants:", err);
  }

  return lines;
};

const copyVisibleBlocks = (event) => {
  event.preventDefault();
  event.stopPropagation();

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

  let allLines = [];

  // Process each top-level block
  const processContainer = (container, baseIndent) => {
    const blockUid = getBlockUidFromElement(container);
    if (!blockUid) return;

    // Check if this block has descendants that are also selected
    const selectedDescendantUids = findSelectedDescendants(blockUid, selectedUids);

    if (selectedDescendantUids.length > 0) {
      // Has selected descendants - build paths ONLY to those descendants
      console.log(`Block ${blockUid} has ${selectedDescendantUids.length} selected descendants - building selective paths`);
      const targetUidsSet = new Set(selectedDescendantUids);
      const pathLines = buildPathToDescendants(blockUid, targetUidsSet, baseIndent);
      allLines.push(...pathLines);
    } else {
      // No selected descendants - copy entire block with ALL children
      console.log(`Block ${blockUid} has no selected descendants - copying all children`);
      const blockLines = getBlockChildren(blockUid, baseIndent);
      allLines.push(...blockLines);
    }
  };

  // Calculate base indentation and process each top-level container
  topLevelContainers.forEach((container) => {
    let baseIndentLevel = 0;
    let currentElement = container;
    while (currentElement) {
      if (currentElement.classList && currentElement.classList.contains('rm-block__children')) {
        baseIndentLevel++;
      }
      currentElement = currentElement.parentElement?.closest('.rm-block__children');
    }

    processContainer(container, Math.max(0, baseIndentLevel - 1));
  });

  const finalContent = allLines.join('\n');

  if (finalContent) {
    // Check if clipboard API is available
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      console.error("Clipboard API is not available");
      showNotification('✗ Error: Clipboard not available', '#DC143C');
      return;
    }

    navigator.clipboard.writeText(finalContent)
      .then(() => {
        showNotification('✓ Copied', '#137CBD');
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        showNotification('✗ Copy failed', '#DC143C');
      });
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
  console.log("Roam Filter Copy extension loaded");
};

// Cleanup function to remove event listener
const cleanupExtension = () => {
  document.removeEventListener('keydown', handleKeyDown);
  console.log("Roam Filter Copy extension unloaded");
};

// Make cleanup available globally for manual cleanup if needed
if (typeof window !== 'undefined') {
  window.roamFilterCopyCleanup = cleanupExtension;
}

// Initialize the extension
initExtension();