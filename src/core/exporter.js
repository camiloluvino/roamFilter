// Roam Filter Export - Exporter
// Converts trees to Markdown and handles file download

/**
 * Convert a tree to Markdown format
 * @param {Array} trees - Array of root nodes
 * @param {number} indentLevel - Current indentation level
 * @returns {string} - Markdown string
 */
export const treeToMarkdown = (trees, indentLevel = 0) => {
    if (!trees || trees.length === 0) {
        return "";
    }

    const lines = [];
    const indent = "  ".repeat(indentLevel);

    for (const node of trees) {
        // Add the node content
        lines.push(`${indent}- ${node.content}`);

        // Recursively add children
        if (node.children && node.children.length > 0) {
            const childrenMd = treeToMarkdown(node.children, indentLevel + 1);
            lines.push(childrenMd);
        }
    }

    return lines.join("\n");
};

/**
 * Generate a filename for the export
 * @param {string} tagName - The tag that was searched
 * @returns {string} - Filename
 */
export const generateFilename = (tagName) => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const safeTagName = tagName.replace(/[^a-zA-Z0-9]/g, "_");
    return `export_${safeTagName}_${dateStr}.md`;
};

/**
 * Download content as a file
 * @param {string} content - File content
 * @param {string} filename - Name of the file
 */
export const downloadFile = (content, filename) => {
    try {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();

        // Cleanup
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

/**
 * Generate export header with metadata
 * @param {string} tagName - The tag searched
 * @param {number} blockCount - Number of blocks found
 * @returns {string} - Header string
 */
export const generateHeader = (tagName, blockCount) => {
    const date = new Date().toLocaleString();
    return `# Export: #${tagName}
> Generated: ${date}
> Blocks found: ${blockCount}

---

`;
};
