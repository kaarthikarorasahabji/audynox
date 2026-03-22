from huggingface_hub import HfApi, create_repo
import os

api = HfApi()
repo_id = "kaarthikdassarora/Audynox-API"
server_dir = os.path.join(os.path.dirname(__file__), "server")

# Create Docker Space
try:
    create_repo(repo_id, repo_type="space", space_sdk="docker", exist_ok=True)
    print(f"Space created/exists: {repo_id}")
except Exception as e:
    print(f"Repo creation: {e}")

# Upload server folder
api.upload_folder(
    folder_path=server_dir,
    repo_id=repo_id,
    repo_type="space",
    ignore_patterns=["node_modules/**"],
)
print(f"Backend deployed! Visit: https://huggingface.co/spaces/{repo_id}")
print(f"API will be at: https://{repo_id.replace('/', '-').lower()}.hf.space")
