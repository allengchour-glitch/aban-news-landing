"""Local read-only technical evidence; never a creative or rights approval."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def inspect(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path.resolve())],
        capture_output=True, text=True, timeout=60, check=True,
    )
    probe = json.loads(result.stdout)
    streams = probe.get('streams', [])
    videos = [s for s in streams if s.get('codec_type') == 'video']
    audios = [s for s in streams if s.get('codec_type') == 'audio']
    return {
        'filename': path.name, 'bytes': path.stat().st_size, 'sha256': digest.hexdigest(),
        'duration': probe.get('format', {}).get('duration'),
        'video': [{k: v.get(k) for k in ['codec_name', 'width', 'height', 'r_frame_rate', 'avg_frame_rate', 'pix_fmt', 'color_range', 'color_space', 'color_transfer', 'color_primaries']} for v in videos],
        'audio': [{k: a.get(k) for k in ['codec_name', 'sample_rate', 'channels']} for a in audios],
        'creativeApproval': 'unknown', 'productBinding': 'unknown', 'rightsApproval': 'unknown',
        'notes': ['Frame-rate metadata does not prove native capture or unique frames.', 'Audio stream presence does not prove approved music or absence of speech.'],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.file), ensure_ascii=False, indent=2))
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'unknown_error', 'error': str(error)}, ensure_ascii=False))
        raise SystemExit(1)
