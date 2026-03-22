from huggingface_hub import HfApi, CommitOperationAdd
import os

api = HfApi()
repo_id = "kaarthikdassarora/Audynox-Spotify"
project_dir = os.path.dirname(os.path.abspath(__file__))

# Create the space if it doesn't exist
try:
    api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker", exist_ok=True)
    print(f"Space {repo_id} ready.")
except Exception as e:
    print(f"Space creation note: {e}")

operations = []

# Add Dockerfile
operations.append(CommitOperationAdd(
    path_in_repo="Dockerfile",
    path_or_fileobj=os.path.join(project_dir, "Dockerfile"),
))

# Add nginx config
operations.append(CommitOperationAdd(
    path_in_repo="docker/nginx/default.conf",
    path_or_fileobj=os.path.join(project_dir, "docker", "nginx", "default.conf"),
))

# Add README with HF Spaces frontmatter
readme_content = """---
title: Audynox Spotify
emoji: 🎧
colorFrom: green
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Audynox - Spotify Web Client
A full-featured Spotify web client with real-time playback, search, playlists, and more.
""".encode("utf-8")

operations.append(CommitOperationAdd(
    path_in_repo="README.md",
    path_or_fileobj=readme_content,
))

# Add .gitignore that allows build and .env
gitignore_content = b"""node_modules
.DS_Store
*.log
"""
operations.append(CommitOperationAdd(
    path_in_repo=".gitignore",
    path_or_fileobj=gitignore_content,
))

# Add all build files (read as bytes to bypass .gitignore)
build_dir = os.path.join(project_dir, "build")
for root, dirs, files in os.walk(build_dir):
    for fname in files:
        local_path = os.path.join(root, fname)
        repo_path = os.path.relpath(local_path, project_dir).replace("\\", "/")
        with open(local_path, "rb") as f:
            operations.append(CommitOperationAdd(
                path_in_repo=repo_path,
                path_or_fileobj=f.read(),
            ))

print(f"Uploading {len(operations)} files...")
api.create_commit(
    repo_id=repo_id,
    repo_type="space",
    operations=operations,
    commit_message="Deploy Audynox with full Spotify integration",
)
print(f"Done! Visit: https://kaarthikdassarora-audynox-spotify.hf.space")
