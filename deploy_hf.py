from huggingface_hub import HfApi, CommitOperationAdd
import os

api = HfApi()
repo_id = "kaarthikdassarora/Audynox"
project_dir = os.path.dirname(os.path.abspath(__file__))

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

# Add README
operations.append(CommitOperationAdd(
    path_in_repo="README.md",
    path_or_fileobj=os.path.join(project_dir, "README.md"),
))

# Add .env (ignored by .gitignore, so read as bytes)
env_path = os.path.join(project_dir, ".env")
with open(env_path, "rb") as f:
    operations.append(CommitOperationAdd(
        path_in_repo=".env",
        path_or_fileobj=f.read(),
    ))

# Add all build files (ignored by .gitignore, so read as bytes)
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
    commit_message="Deploy pre-built frontend with nginx",
)
print(f"Done! Visit: https://kaarthikdassarora-audynox.hf.space")
