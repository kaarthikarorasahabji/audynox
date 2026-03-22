from huggingface_hub import HfApi
import os

api = HfApi()
repo_id = "kaarthikdassarora/Audynox"
project_dir = os.path.dirname(os.path.abspath(__file__))

# Upload only the files that changed
files_to_upload = [
    "README.md",
    "Dockerfile",
    ".env",
    "docker/nginx/default.conf",
]

for f in files_to_upload:
    local_path = os.path.join(project_dir, f)
    if os.path.exists(local_path):
        print(f"Uploading {f}...")
        api.upload_file(
            path_or_fileobj=local_path,
            path_in_repo=f,
            repo_id=repo_id,
            repo_type="space",
        )
        print(f"  Done: {f}")

print(f"\nUpdated! Visit: https://huggingface.co/spaces/{repo_id}")
