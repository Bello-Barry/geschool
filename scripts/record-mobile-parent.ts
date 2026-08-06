import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://geschool.vercel.app';

async function run() {
  console.log('🎬 Running Séquence 3 — Parent Automation & Asset Generation (Mobile, 390x844)...');

  // Load seeded credentials
  const credentialsFilePath = path.join(process.cwd(), 'captures', 'credentials.json');
  if (!fs.existsSync(credentialsFilePath)) {
    console.error('❌ Credentials file not found! Seed the database first.');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  const { subdomain, parents, students } = credentials;
  const parent = parents[0]; // Guy Ngouabi
  const child = students.find((s: any) => s.email === parent.childEmail);
  if (!child) throw new Error('Child student not found!');

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
    // 1. CONNEXION PARENT SUR MOBILE
    console.log('   - Navigating to Parent Login on Mobile...');
    await page.goto(`${BASE_URL}/${subdomain}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Capture connexion page
    await page.screenshot({ path: 'captures/mobile-parent-01-connexion.png' });
    console.log('   ✅ Captured mobile-parent-01-connexion.png');

    // Type credentials
    await page.type('input[type="email"]', parent.email, { delay: 100 });
    await page.type('input[type="password"]', parent.pw, { delay: 100 });
    await page.waitForTimeout(1000);

    // Submit and wait for parent dashboard redirect
    await Promise.all([
      page.waitForURL(`**/${subdomain}/parent`, { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 2. PARENT DASHBOARD (Vue d'ensemble de l'enfant)
    console.log('   - Loading Parent Dashboard...');
    await page.screenshot({ path: 'captures/mobile-parent-02-dashboard.png' });
    console.log('   ✅ Captured mobile-parent-02-dashboard.png');

    // 3. CONSULTATION DU BULLETIN PDF DE L'ENFANT
    console.log('   - Navigating to Child Reports Page...');
    await page.goto(`${BASE_URL}/${subdomain}/parent/children/${child.id}/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'captures/mobile-parent-03-bulletin.png' });
    console.log('   ✅ Captured mobile-parent-03-bulletin.png');

    // 4. CONSULTATION DE L'EMPLOI DU TEMPS DE L'ENFANT
    console.log('   - Navigating to Child Schedule Page...');
    await page.goto(`${BASE_URL}/${subdomain}/parent/children/${child.id}/schedule`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'captures/mobile-parent-04-emploi-temps.png' });
    console.log('   ✅ Captured mobile-parent-04-emploi-temps.png');

    // 5. MESSAGERIE INTERNE (Message de l'enseignant)
    console.log('   - Navigating to Parent Messaging...');
    await page.goto(`${BASE_URL}/${subdomain}/parent/messages`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Click on the conversation to show message history
    const convRow = page.locator('button:has-text("Mamadou Ngouabi")').first();
    if (await convRow.isVisible()) {
      await convRow.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'captures/mobile-parent-05-messagerie.png' });
    console.log('   ✅ Captured mobile-parent-05-messagerie.png');

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
        path.join(process.cwd(), 'captures', 'videos', 'sequence-3-parent.webm')
      );
      console.log('   ✅ Video saved and renamed to captures/videos/sequence-3-parent.webm');
    }

    console.log('🎉 Séquence 3 Parent Automation completed successfully !');

  } catch (error) {
    console.error('❌ Séquence 3 Parent failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run();
}
