import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://geschool.vercel.app';

async function run() {
  console.log('🎬 Running Séquence 4 — Élève Automation & Asset Generation (Mobile, 390x844)...');

  // Load seeded credentials
  const credentialsFilePath = path.join(process.cwd(), 'captures', 'credentials.json');
  if (!fs.existsSync(credentialsFilePath)) {
    console.error('❌ Credentials file not found! Seed the database first.');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  const { subdomain, students } = credentials;
  const student = students[0]; // Alain Ngouabi

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: {
      dir: path.join(process.cwd(), 'captures', 'videos'),
      size: { width: 390, height: 844 }
    }
  });

  const page = await context.newPage();

  try {
    // 1. CONNEXION ELEVE SUR MOBILE
    console.log('   - Navigating to Student Login on Mobile...');
    await page.goto(`${BASE_URL}/${subdomain}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Capture connexion page
    await page.screenshot({ path: 'captures/mobile-student-01-connexion.png' });
    console.log('   ✅ Captured mobile-student-01-connexion.png');

    // Type credentials
    await page.type('input[type="email"]', student.email, { delay: 100 });
    await page.type('input[type="password"]', student.pw, { delay: 100 });
    await page.waitForTimeout(1000);

    // Submit and wait for student dashboard redirect
    await Promise.all([
      page.waitForURL(`**/${subdomain}/student`, { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 2. SES NOTES RECENTES (Page notes/grades)
    console.log('   - Navigating to Student Grades...');
    await page.goto(`${BASE_URL}/${subdomain}/student/grades`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'captures/mobile-student-02-notes.png' });
    console.log('   ✅ Captured mobile-student-02-notes.png');

    // 3. LE COURS PUBLIE PAR LE PROF
    console.log('   - Navigating to Student Courses...');
    await page.goto(`${BASE_URL}/${subdomain}/student/courses`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot of course list
    await page.screenshot({ path: 'captures/mobile-student-03-cours.png' });
    console.log('   ✅ Captured mobile-student-03-cours.png');

    // 4. SON EMPLOI DU TEMPS
    console.log('   - Navigating to Student Schedule...');
    await page.goto(`${BASE_URL}/${subdomain}/student/schedule`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot of daily schedule
    await page.screenshot({ path: 'captures/mobile-student-04-emploi-temps.png' });
    console.log('   ✅ Captured mobile-student-04-emploi-temps.png');

    await page.waitForTimeout(1000);

    // Close page to save video nicely
    await page.close();
    await context.close();

    // Now let's rename the recorded video
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for video to flush to disk
    const videoFiles = fs.readdirSync(path.join(process.cwd(), 'captures', 'videos')).filter(f => f.endsWith('.webm'));
    console.log(`   - Video files: ${JSON.stringify(videoFiles)}`);

    if (videoFiles.length > 0) {
      // Find the newest video or rename
      const latestVideo = videoFiles.sort((a, b) => {
        return fs.statSync(path.join(process.cwd(), 'captures', 'videos', b)).mtimeMs -
               fs.statSync(path.join(process.cwd(), 'captures', 'videos', a)).mtimeMs;
      })[0];
      fs.renameSync(
        path.join(process.cwd(), 'captures', 'videos', latestVideo),
        path.join(process.cwd(), 'captures', 'videos', 'sequence-4-student.webm')
      );
      console.log('   ✅ Video saved and renamed to captures/videos/sequence-4-student.webm');
    }

    console.log('🎉 Séquence 4 Élève Automation completed successfully !');

  } catch (error) {
    console.error('❌ Séquence 4 Élève failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run();
}
