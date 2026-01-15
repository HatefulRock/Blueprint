import os

# Directories and files to ignore
# Expanded set to include common frontend-related items.
IGNORE = {
    # General & Python
    ".venv",
    "venv",
    "__pycache__",
    # Version Control
    ".git",
    # IDEs and Editors
    ".idea",
    ".vscode",
    # OS-specific
    ".DS_Store",
    "Thumbs.db",
    "Documents",
    # --- Frontend Specific ---
    # Package Manager Directories (VERY IMPORTANT)
    "node_modules",
    # Build & Distribution Output
    "dist",
    "build",
    "out",
    ".next",
    ".svelte-kit",
    "public/build",
    # Cache Directories
    ".cache",
    ".vite",
    # Lock Files
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    # Docs
    "docs",
    "backend/docs",
    "frontend/docs",
}


def tree(directory, path_list, prefix="", root_dir=None):
    """
    Prints a visual tree and collects file paths into `path_list`.

    Args:
        directory (str): The directory to scan.
        path_list (list): A list to append the relative paths to.
        prefix (str): The prefix for printing the visual tree.
        root_dir (str): The root directory of the scan, for creating relative paths.
    """
    if root_dir is None:
        root_dir = directory

    try:
        items = [item for item in os.listdir(directory) if item not in IGNORE]
    except PermissionError:
        print(prefix + "└── [Permission Denied]")
        return
    except FileNotFoundError:
        print(prefix + f"└── [Error: Directory not found at '{directory}']")
        return

    if not items:
        return

    items.sort()
    for index, item in enumerate(items):
        path = os.path.join(directory, item)

        # --- New: Collect the relative path for the LLM list ---
        relative_path = os.path.relpath(path, root_dir)
        # Normalize path separators to forward slashes for consistency
        path_list.append(relative_path.replace(os.sep, "/"))

        # --- Existing: Print the visual tree ---
        connector = "└── " if index == len(items) - 1 else "├── "
        print(prefix + connector + item)

        if os.path.isdir(path):
            extension = "    " if index == len(items) - 1 else "│   "
            tree(path, path_list, prefix + extension, root_dir)


if __name__ == "__main__":
    root_dir = "."
    abs_root = os.path.abspath(root_dir)

    # --- Part 1: Generate the visual tree and collect paths ---
    print(f"--- Visual Tree for: {abs_root} ---")
    collected_paths = []
    tree(root_dir, collected_paths)

    # --- Part 2: Print the compact list for LLMs ---
    print("\n" * 2)  # Add some space for clarity
    print("--- Compact File List for LLM (copy from here) ---")
    print("```")

    # Sort the paths for a clean, deterministic order
    collected_paths.sort()

    for path in collected_paths:
        # Avoid printing the root directory itself ('.') in the compact list
        if path != ".":
            print(path)

    print("```")
