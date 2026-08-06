import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://geschool.vercel.app';

async function run() {
  console.log('🎬 Running Séquence 1 — Admin Automation & Asset Generation (Desktop, 1920x1080)...');

  // Load seeded credentials
  const credentialsFilePath = path.join(process.cwd(), 'captures', 'credentials.json');
  if (!fs.existsSync(credentialsFilePath)) {
    console.error('❌ Credentials file not found! Seed the database first.');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  const { subdomain, admin, students } = credentials;
  const firstStudent = students[0]; // Alain Ngouabi

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: path.join(process.cwd(), 'captures', 'videos'),
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // 1. PAGE DE CONNEXION ADMIN
    console.log('   - Navigating to Admin Login...');
    await page.goto(`${BASE_URL}/${subdomain}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000); // Natural pause

    // Take screenshot of connexion page
    await page.screenshot({ path: 'captures/admin-01-connexion.png' });
    console.log('   ✅ Captured admin-01-connexion.png');

    // Human-like fill & submit
    await page.type('input[type="email"]', admin.email, { delay: 100 });
    await page.type('input[type="password"]', admin.pw, { delay: 100 });
    await page.waitForTimeout(1000);

    // Submit & wait for dashboard redirect
    await Promise.all([
      page.waitForURL(`**/${subdomain}/admin`, { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let dashboard load completely

    // 2. ADMIN DASHBOARD
    console.log('   - Loading Admin Dashboard...');
    // Take screenshot of admin dashboard
    await page.screenshot({ path: 'captures/admin-02-dashboard.png' });
    console.log('   ✅ Captured admin-02-dashboard.png');

    // 3. ELEVES LISTE
    console.log('   - Navigating to Student List...');
    await page.goto(`${BASE_URL}/${subdomain}/admin/students`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // wait for table load

    // Take screenshot of student list
    await page.screenshot({ path: 'captures/admin-03-eleves-liste.png' });
    console.log('   ✅ Captured admin-03-eleves-liste.png');

    // 4. GENERATION BULLETIN PDF
    console.log(`   - Navigating to Student Alain Ngouabi Details (${firstStudent.id})...`);
    await page.goto(`${BASE_URL}/${subdomain}/admin/students/${firstStudent.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Let detail load

    // Check if report card is already generated or if we should click generate
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Générer le bulletin')) {
      console.log('   - Generating bulletin...');
      await page.click('button:has-text("Générer le bulletin")');
      await page.waitForTimeout(4000); // Wait for generation
    } else {
      console.log('   - Bulletin already generated.');
    }

    // Refresh page to make sure "Télécharger" is visible
    await page.goto(`${BASE_URL}/${subdomain}/admin/students/${firstStudent.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot of bulletin section / student details
    await page.screenshot({ path: 'captures/admin-04-bulletin-pdf.png' });
    console.log('   ✅ Captured admin-04-bulletin-pdf.png');

    // 5. EMPLOI DU TEMPS
    console.log('   - Navigating to Emploi du Temps...');
    await page.goto(`${BASE_URL}/${subdomain}/admin/schedule`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for schedule grid

    // Take screenshot of schedule grid
    await page.screenshot({ path: 'captures/admin-05-emploi-temps.png' });
    console.log('   ✅ Captured admin-05-emploi-temps.png');

    await page.waitForTimeout(2000);

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
        path.join(process.cwd(), 'captures', 'videos', 'sequence-1-admin.webm')
      );
      console.log('   ✅ Video saved and renamed to captures/videos/sequence-1-admin.webm');
    }

    console.log('🎉 Séquence 1 Admin Automation completed successfully !');

  } catch (error) {
    console.error('❌ Séquence 1 Admin failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run();
}
