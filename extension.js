// Copy Visible Blocks with Smart Descendant Selection
// Created by Camilo Luvino
// https://github.com/camiloluvino/roamFilter

const getBlockChildren = (blockUid, currentIndent) => {
  const lines = [];
  
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
  const blockElement = container.querySelector('[id^="block-input-"]');
  if (blockElement) {
    const id = blockElement.id;
    const parts = id.split('-');
    return parts[parts.length - 1];
  }
  return null;
};

const isDescendantOf = (childContainer, potentialAncestorContainer) => {
  let current = childContainer.parentElement;
  while (current) {
    if (current === potentialAncestorContainer) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const hasSelectedDescendants = (container, allSelectedContainers) => {
  return allSelectedContainers.some(otherContainer => 
    otherContainer !== container && isDescendantOf(otherContainer, container)
  );
};

const getBlockTextOnly = (container, indent) => {
  const blockMain = container.querySelector('.rm-block-main');
  if (blockMain) {
    const editableArea = blockMain.querySelector('.rm-block__input, [contenteditable="true"]');
    let blockContent = '';
    
    if (editableArea) {
      blockContent = editableArea.textContent || editableArea.innerText;
    } else {
      blockContent = blockMain.textContent || blockMain.innerText;
    }
    
    blockContent = blockContent.trim();
    if (blockContent) {
      return '  '.repeat(indent) + '- ' + blockContent;
    }
  }
  return null;
};

const copyVisibleBlocks = (event) => {
  event.preventDefault();
  event.stopPropagation();
  
  const selectedContainers = Array.from(document.querySelectorAll('.block-highlight-blue'));
  
  if (selectedContainers.length === 0) {
    return;
  }
  
  const topLevelContainers = selectedContainers.filter(container => {
    return !selectedContainers.some(otherContainer => 
      otherContainer !== container && isDescendantOf(container, otherContainer)
    );
  });
  
  let allLines = [];
  
  const processContainer = (container, baseIndent) => {
    const blockUid = getBlockUidFromElement(container);
    if (!blockUid) return;
    
    const hasSelectedChildren = hasSelectedDescendants(container, selectedContainers);
    
    if (hasSelectedChildren) {
      const blockText = getBlockTextOnly(container, baseIndent);
      if (blockText) {
        allLines.push(blockText);
      }
      
      const selectedChildren = selectedContainers.filter(child => 
        isDescendantOf(child, container) && 
        child.parentElement.closest('.roam-block-container') === container
      );
      
      selectedChildren.forEach(child => {
        processContainer(child, baseIndent + 1);
      });
    } else {
      const blockLines = getBlockChildren(blockUid, baseIndent);
      allLines.push(...blockLines);
    }
  };
  
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
    navigator.clipboard.writeText(finalContent).then(() => {
      const notification = document.createElement('div');
      notification.textContent = '✓ Copiado';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #137CBD;
        color: white;
        padding: 10px 16px;
        border-radius: 4px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
        font-size: 14px;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 1500);
    });
  }
};

const handleKeyDown = (event) => {
  if (event.altKey && event.shiftKey && event.key === 'C') {
    copyVisibleBlocks(event);
  }
};

document.addEventListener('keydown', handleKeyDown);