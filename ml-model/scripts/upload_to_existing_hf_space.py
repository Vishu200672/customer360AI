import os
import sys
from huggingface_hub import HfApi

def upload_space():
    print("=== Hugging Face Space Auto-Uploader ===")
    token = os.environ.get("HF_TOKEN")
    space_id = os.environ.get("HF_SPACE_ID", "Vishu2006/customer360-ai")

    if not token:
        print("[!] HF_TOKEN environment variable not found.")
        token = input("Please enter your Hugging Face Access Token (write permission): ").strip()
        if not token:
            print("[ERROR] Token is required to upload files to HF Space.")
            sys.exit(1)

    api = HfApi(token=token)
    project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    print(f"[*] Uploading files from '{project_dir}' to Space '{space_id}'...")
    try:
        api.upload_folder(
            folder_path=project_dir,
            repo_id=space_id,
            repo_type="space",
            ignore_patterns=[
                ".git*",
                "__pycache__/*",
                "*.pyc",
                ".venv/*",
                "venv/*"
            ]
        )
        print(f"\n[SUCCESS] Successfully uploaded all project files and model artifacts to Hugging Face Space!")
        print(f"🔗 Live Space URL: https://huggingface.co/spaces/{space_id}")
        print(f"🌐 Direct Health Endpoint for UptimeRobot: https://{space_id.replace('/', '-').lower()}.hf.space/health")
    except Exception as e:
        print(f"\n[ERROR] Failed to upload to Space '{space_id}': {e}")

if __name__ == "__main__":
    upload_space()
