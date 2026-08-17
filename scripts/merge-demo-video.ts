import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const OUT = "C:\\Users\\barry\\AppData\\Local\\Temp\\opencode\\geschool-demo";
const TMP = join(OUT, "intermediate");
mkdirSync(TMP, { recursive: true });

const ffmpeg: string = (() => {
  try {
    return require("ffmpeg-static");
  } catch {
    return "";
  }
})();
if (!ffmpeg) throw new Error("ffmpeg-static introuvable");

const roles = ["admin", "teacher", "student", "parent"];

// Finder les fichiers .webm (Playwright génère des noms aléatoires)
const webms = readdirSync(OUT).filter((f) => f.endsWith(".webm"));
for (const role of roles) {
  const clip = webms.find((f) => f.startsWith(role + ".")) || webms.find((f) => f === role + ".webm");
  if (!clip) throw new Error(`clip manquant: ${role}`);
}

function run(args: string[]) {
  return execSync(`"${ffmpeg}" ${args.map((a) => `"${a}"`).join(" ")}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }).split("\n");
}

// 1. Convertir chaque webm en mp4 (libx264, yuv420p) — mêmes paramètres pour concat propre
roles.forEach((role, i) => {
  const clip = webms.find((f) => f.startsWith(role + "."))!;
  const out = join(TMP, `${i}.mp4`);
  console.log(`encodage ${role}...`);
  run(["-y", "-i", join(OUT, clip), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "25", "-an", out]);
});

// 2. Concaténer
const list = join(TMP, "list.txt");
writeFileSync(list, roles.map((_, i) => `file '${join(TMP, `${i}.mp4`).replace(/'/g, "'\\''")}'`).join("\n"));
console.log("concat...");
const finalPath = join(process.cwd(), "geschool-demo.mp4");
run(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", finalPath]);

// 3. Infos durée
const dur = run(["-i", finalPath, "-f", "null", "-"]).join("\n").match(/Duration: (\d+:\d+:\d+\.\d+)/)?.[1] ?? "?";
const size = (statSync(finalPath).size / (1024 * 1024)).toFixed(1);
console.log(`\nOK → ${finalPath}`);
console.log(`Durée: ${dur} | Taille: ${size} Mo`);