import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://geschool.vercel.app';

async function run() {
  console.log('🎬 Running Séquence 2 — Enseignant Automation & Asset Generation (Mobile, 390x844)...');

  // Load seeded credentials
  const credentialsFilePath = path.join(process.cwd(), 'captures', 'credentials.json');
  if (!fs.existsSync(credentialsFilePath)) {
    console.error('❌ Credentials file not found! Seed the database first.');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  const { subdomain, teachers, classIds, subjectIds } = credentials;
  const teacher = teachers[0]; // Mamadou Ngouabi
  const classId = classIds['6ème A'];
  const subjectId = subjectIds['Mathématiques'];

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
    // 1. CONNEXION ENSEIGNANT SUR MOBILE
    console.log('   - Navigating to Teacher Login on Mobile...');
    await page.goto(`${BASE_URL}/${subdomain}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Capture connexion page
    await page.screenshot({ path: 'captures/mobile-teacher-01-connexion.png' });
    console.log('   ✅ Captured mobile-teacher-01-connexion.png');

    // Type credentials
    await page.type('input[type="email"]', teacher.email, { delay: 100 });
    await page.type('input[type="password"]', teacher.pw, { delay: 100 });
    await page.waitForTimeout(1000);

    // Submit and wait for redirect to teacher dashboard
    await Promise.all([
      page.waitForURL(`**/${subdomain}/teacher`, { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 2. DASHBOARD ENSEIGNANT ("Mon prochain cours")
    console.log('   - Loading Teacher Dashboard...');
    await page.screenshot({ path: 'captures/mobile-teacher-02-dashboard.png' });
    console.log('   ✅ Captured mobile-teacher-02-dashboard.png');

    // 3. SAISIE DE NOTES (Moyenne calculée en direct)
    console.log('   - Navigating to Grade Entry Page...');
    await page.goto(`${BASE_URL}/${subdomain}/teacher/grades/${classId}/${subjectId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Focus on first input, write a grade, wait to see the live calculated average
    const firstInput = page.locator('input[type="number"]').first();
    await firstInput.click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('18', { delay: 100 });
    await page.waitForTimeout(1500); // Live average recomputes

    await page.screenshot({ path: 'captures/mobile-teacher-03-saisie-notes.png' });
    console.log('   ✅ Captured mobile-teacher-03-saisie-notes.png');

    // Save grades
    const saveBtn = page.locator('button:has-text("Sauvegarder")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4. SAISIE DE PRESENCE RAPIDE
    console.log('   - Navigating to Attendance Page...');
    await page.goto(`${BASE_URL}/${subdomain}/teacher/attendance`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Capture presence list
    await page.screenshot({ path: 'captures/mobile-teacher-04-presence.png' });
    console.log('   ✅ Captured mobile-teacher-04-presence.png');

    // 5. PUBLICATION D'UN COURS AVEC PIECE JOINTE
    console.log('   - Navigating to Course Publication...');
    await page.goto(`${BASE_URL}/${subdomain}/teacher/courses`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Capture course list/form page
    await page.screenshot({ path: 'captures/mobile-teacher-05-cours-publication.png' });
    console.log('   ✅ Captured mobile-teacher-05-cours-publication.png');

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
        path.join(process.cwd(), 'captures', 'videos', 'sequence-2-teacher.webm')
      );
      console.log('   ✅ Video saved and renamed to captures/videos/sequence-2-teacher.webm');
    }

    console.log('🎉 Séquence 2 Enseignant Automation completed successfully !');

  } catch (error) {
    console.error('❌ Séquence 2 Enseignant failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run();
}
