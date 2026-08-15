import os
import subprocess
import json

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
THEME_COLOR = "0x0F766E" # Emerald Green / Dark Teal
THEME_COLOR_HEX = "#0F766E"

def run_cmd(cmd):
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error executing command. Code: {res.returncode}")
        print(f"STDOUT: {res.stdout}")
        print(f"STDERR: {res.stderr}")
        raise RuntimeError(f"FFmpeg error: {res.stderr}")

def main():
    print("🎬 Starting Automatic Video Compilation Pipeline...")
    os.makedirs("temp_segments", exist_ok=True)
    os.makedirs("demo-final", exist_ok=True)

    # 1. COMPILE 16x9 (LANDSCAPE) SEGMENTS
    print("\n--- Compiling Landscape (16x9) Segments ---")

    # 1.1 Intro Landscape (3s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1920x1080:d=3",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='GESchool':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-80,"
               f"drawtext=fontfile={FONT_REGULAR}:text='La gestion scolaire nouvelle génération, pensée pour le Congo':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+40",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_intro.mp4"
    ])

    # 1.2 Sequence 1 Admin Landscape (18s) - speed up 45s by 2.5x -> ~18s (PTS * 0.4)
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-1-admin.webm",
        "-vf", f"setpts=0.4*PTS,scale=1920:1080,drawtext=fontfile={FONT_BOLD}:text='Administration générale — Collège Excellence':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_seq1.mp4"
    ])

    # 1.3 Transition 1 Landscape (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1920x1080:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Pour les enseignants...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_trans1.mp4"
    ])

    # 1.4 Sequence 2 Teacher Landscape (13s) - speed up 38.8s by 3.0x -> ~13s (PTS * 0.33)
    # Scale vertical browser (390x844) to height 960 and pad in centered 1920x1080 with Theme background
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-2-teacher.webm",
        "-vf", f"setpts=0.33*PTS,scale=-1:960,pad=1920:1080:(1920-iw)/2:(1080-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Saisie des notes et appel de présence en direct sur mobile':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_seq2.mp4"
    ])

    # 1.5 Transition 2 Landscape (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1920x1080:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Pour les parents, en temps réel...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_trans2.mp4"
    ])

    # 1.6 Sequence 3 Parent Landscape (13s) - speed up 33s by 2.5x -> ~13s (PTS * 0.4)
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-3-parent.webm",
        "-vf", f"setpts=0.4*PTS,scale=-1:960,pad=1920:1080:(1920-iw)/2:(1080-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Suivi de la scolarité, bulletins et messagerie pour les parents':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_seq3.mp4"
    ])

    # 1.7 Transition 3 Landscape (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1920x1080:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Et pour les élèves...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_trans3.mp4"
    ])

    # 1.8 Sequence 4 Student Landscape (11s) - speed up 35.4s by 3.2x -> ~11s (PTS * 0.31)
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-4-student.webm",
        "-vf", f"setpts=0.31*PTS,scale=-1:960,pad=1920:1080:(1920-iw)/2:(1080-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Espace élève pour réviser et consulter ses notes en toute autonomie':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_seq4.mp4"
    ])

    # 1.9 Outro Landscape (5s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1920x1080:d=5",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='GESchool':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-80,"
               f"drawtext=fontfile={FONT_REGULAR}:text='La plateforme de gestion scolaire de référence au Congo':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+20,"
               f"drawtext=fontfile={FONT_REGULAR}:text='Visitez geschool.vercel.app':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2+100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/l_outro.mp4"
    ])

    # Concat Landscape Segments
    print("\n🔗 Concatenating Landscape (16x9) Segments...")
    with open("temp_segments/l_list.txt", "w") as f:
        f.write("file 'l_intro.mp4'\n")
        f.write("file 'l_seq1.mp4'\n")
        f.write("file 'l_trans1.mp4'\n")
        f.write("file 'l_seq2.mp4'\n")
        f.write("file 'l_trans2.mp4'\n")
        f.write("file 'l_seq3.mp4'\n")
        f.write("file 'l_trans3.mp4'\n")
        f.write("file 'l_seq4.mp4'\n")
        f.write("file 'l_outro.mp4'\n")

    run_cmd([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "temp_segments/l_list.txt",
        "-c", "copy", "demo-final/demo-geschool-16x9.mp4"
    ])
    print("✅ Completed Landscape Video: demo-final/demo-geschool-16x9.mp4")


    # 2. COMPILE 9x16 (VERTICAL) SEGMENTS
    print("\n--- Compiling Vertical (9x16) Segments ---")

    # 2.1 Intro Vertical (3s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1080x1920:d=3",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='GESchool':fontcolor=white:fontsize=84:x=(w-text_w)/2:y=(h-text_h)/2-120,"
               f"drawtext=fontfile={FONT_REGULAR}:text='La gestion scolaire nouvelle':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+20,"
               f"drawtext=fontfile={FONT_REGULAR}:text='génération, pensée pour le Congo':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+80",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_intro.mp4"
    ])

    # 2.2 Sequence 1 Admin Vertical (18s) - Scale landscape (1920x1080) to 1080 width (1080x608) and pad in 1080x1920
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-1-admin.webm",
        "-vf", f"setpts=0.4*PTS,scale=1080:-1,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Administration générale':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-300",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_seq1.mp4"
    ])

    # 2.3 Transition 1 Vertical (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1080x1920:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Pour les enseignants...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_trans1.mp4"
    ])

    # 2.4 Sequence 2 Teacher Vertical (13s) - Scale browser (390x844) to height 1800 and pad in centered 1080x1920
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-2-teacher.webm",
        "-vf", f"setpts=0.33*PTS,scale=-1:1800,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Saisie des notes et appel':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-250,"
               f"drawtext=fontfile={FONT_BOLD}:text='de présence en direct':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-190",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_seq2.mp4"
    ])

    # 2.5 Transition 2 Vertical (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1080x1920:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Pour les parents...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_trans2.mp4"
    ])

    # 2.6 Sequence 3 Parent Vertical (13s)
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-3-parent.webm",
        "-vf", f"setpts=0.4*PTS,scale=-1:1800,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Suivi de scolarité et':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-250,"
               f"drawtext=fontfile={FONT_BOLD}:text='messagerie en temps réel':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-190",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_seq3.mp4"
    ])

    # 2.7 Transition 3 Vertical (2s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1080x1920:d=2",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='Et pour les élèves...':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_trans3.mp4"
    ])

    # 2.8 Sequence 4 Student Vertical (11s)
    run_cmd([
        "ffmpeg", "-y", "-i", "captures/videos/sequence-4-student.webm",
        "-vf", f"setpts=0.31*PTS,scale=-1:1800,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:{THEME_COLOR},"
               f"drawtext=fontfile={FONT_BOLD}:text='Espace personnel autonome':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-250",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_seq4.mp4"
    ])

    # 2.9 Outro Vertical (5s)
    run_cmd([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={THEME_COLOR}:s=1080x1920:d=5",
        "-vf", f"drawtext=fontfile={FONT_BOLD}:text='GESchool':fontcolor=white:fontsize=84:x=(w-text_w)/2:y=(h-text_h)/2-160,"
               f"drawtext=fontfile={FONT_REGULAR}:text='La plateforme de référence':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2-40,"
               f"drawtext=fontfile={FONT_REGULAR}:text='au Congo-Brazzaville':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+20,"
               f"drawtext=fontfile={FONT_REGULAR}:text='Visitez geschool.vercel.app':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2+120",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "temp_segments/v_outro.mp4"
    ])

    # Concat Vertical Segments
    print("\n🔗 Concatenating Vertical (9x16) Segments...")
    with open("temp_segments/v_list.txt", "w") as f:
        f.write("file 'v_intro.mp4'\n")
        f.write("file 'v_seq1.mp4'\n")
        f.write("file 'v_trans1.mp4'\n")
        f.write("file 'v_seq2.mp4'\n")
        f.write("file 'v_trans2.mp4'\n")
        f.write("file 'v_seq3.mp4'\n")
        f.write("file 'v_trans3.mp4'\n")
        f.write("file 'v_seq4.mp4'\n")
        f.write("file 'v_outro.mp4'\n")

    run_cmd([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "temp_segments/v_list.txt",
        "-c", "copy", "demo-final/demo-geschool-9x16.mp4"
    ])
    print("✅ Completed Vertical Video: demo-final/demo-geschool-9x16.mp4")

    # 3. EXTRACTION DE FRAMES DE VÉRIFICATION
    print("\n📸 Extracting Verification Frames...")
    # Extract frames from final landscape video at 5s, 25s, 45s, 60s
    timestamps = [5, 25, 45, 60]
    for idx, ts in enumerate(timestamps):
        run_cmd([
            "ffmpeg", "-y", "-ss", str(ts), "-i", "demo-final/demo-geschool-16x9.mp4",
            "-frames:v", "1", f"demo-final/frame-0{idx+1}.png"
        ])
        print(f"   ✅ Saved demo-final/frame-0{idx+1}.png at {ts}s")

    print("\n🚀 SUCCESS! Video compilation completed and verified. Check output assets in demo-final/")

if __name__ == "__main__":
    main()
