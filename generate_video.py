import os
import subprocess
import imageio_ffmpeg

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, "Dalal_Street_Pulse_Presentation.html")
AUDIO_DIR = os.path.join(BASE_DIR, "presentation_assets", "audio")
FRAMES_DIR = os.path.join(BASE_DIR, "presentation_assets", "frames")
SEGMENTS_DIR = os.path.join(BASE_DIR, "presentation_assets", "segments")

os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(SEGMENTS_DIR, exist_ok=True)

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

NUM_SLIDES = 12

print("=== Starting Video Generation Pipeline ===")
print(f"FFmpeg binary: {FFMPEG_EXE}")

# Step 1: Capture 1080p Screenshots for each slide
print("\n--- Step 1: Capturing 1080p slide screenshots with Edge ---")
for i in range(NUM_SLIDES):
    slide_num = i + 1
    frame_path = os.path.join(FRAMES_DIR, f"slide_{slide_num}.png")
    url = f"file:///{HTML_PATH.replace(os.sep, '/')}?slide={i}"
    
    print(f"  [Slide {slide_num}/{NUM_SLIDES}] Capturing screenshot...")
    cmd = [
        EDGE_EXE,
        "--headless",
        "--disable-gpu",
        "--window-size=1920,1080",
        f"--screenshot={frame_path}",
        url
    ]
    subprocess.run(cmd, check=True)
print("All 12 slide frames captured!")

# Step 2: Combine frame and audio into MP4 video segments
print("\n--- Step 2: Encoding video segments with FFmpeg ---")
concat_entries = []
for i in range(NUM_SLIDES):
    slide_num = i + 1
    frame_path = os.path.join(FRAMES_DIR, f"slide_{slide_num}.png")
    audio_path = os.path.join(AUDIO_DIR, f"slide_{slide_num}.mp3")
    seg_path = os.path.join(SEGMENTS_DIR, f"seg_{slide_num}.mp4")
    
    print(f"  [Slide {slide_num}/{NUM_SLIDES}] Encoding MP4 segment...")
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-loop", "1",
        "-i", frame_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        seg_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    concat_entries.append(f"file '{seg_path.replace(os.sep, '/')}'\n")

# Step 3: Concatenate all segments into final full-length video
print("\n--- Step 3: Concatenating segments into final video ---")
concat_list_file = os.path.join(SEGMENTS_DIR, "concat_list.txt")
with open(concat_list_file, "w", encoding="utf-8") as f:
    f.writelines(concat_entries)

OUTPUT_VIDEO = os.path.join(BASE_DIR, "Dalal_Street_Pulse_Presentation_Video.mp4")

concat_cmd = [
    FFMPEG_EXE,
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_list_file,
    "-c", "copy",
    OUTPUT_VIDEO
]
subprocess.run(concat_cmd, check=True)

size_mb = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
print(f"\nSUCCESS! Screen recording presentation video generated: {OUTPUT_VIDEO}")
print(f"File size: {size_mb:.2f} MB")
