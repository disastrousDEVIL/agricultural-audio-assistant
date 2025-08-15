import argparse
import mimetypes
import os
import sys
import requests


def main():
    parser = argparse.ArgumentParser(description="Send an audio file to the FastAPI backend.")
    parser.add_argument("file", help="Path to the audio file (wav/mp3/m4a/ogg/flac)")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    parser.add_argument("--language", default="en", help="Language code for transcription (default: en)")
    parser.add_argument("--download", action="store_true", help="Download generated audio response")
    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"File not found: {args.file}")
        sys.exit(1)

    endpoint = f"{args.base_url.rstrip('/')}/recommend-from-audio"

    mime, _ = mimetypes.guess_type(args.file)
    mime = mime or "application/octet-stream"

    with open(args.file, "rb") as f:
        files = {
            # Field name must match backend parameter name `audio_file`
            "audio_file": (os.path.basename(args.file), f, mime),
        }
        data = {"language": args.language}

        try:
            resp = requests.post(endpoint, files=files, data=data, timeout=120)
        except requests.RequestException as e:
            print("Request failed:", e)
            sys.exit(2)

    print("Status:", resp.status_code)

    # Try to print JSON if available; otherwise print text
    try:
        payload = resp.json()
        print("Response:", payload)
    except ValueError:
        print("Response (text):", resp.text)
        sys.exit(0 if resp.ok else 3)

    if not resp.ok:
        sys.exit(3)

    # Optionally download generated audio
    if args.download and isinstance(payload, dict) and payload.get("audio_download_url"):
        download_url = f"{args.base_url.rstrip('/')}{payload['audio_download_url']}"
        out_name = payload.get("audio_filename") or f"response_{payload.get('request_id','')}.mp3"
        try:
            r = requests.get(download_url, timeout=120)
            r.raise_for_status()
            with open(out_name, "wb") as out:
                out.write(r.content)
            print(f"Downloaded audio to: {out_name}")
        except requests.RequestException as e:
            print("Failed to download audio:", e)


if __name__ == "__main__":
    main()
