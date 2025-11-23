import { Org } from '@salesforce/core';
import { Browserforce } from '../src/browserforce.js';
import { Ux } from '@salesforce/sf-plugins-core';

async function testLogin() {
  console.log('Starting login test...');

  try {
    // Use default org from project
    const org = await Org.create({ aliasOrUsername: undefined });
    const ux = new Ux();
    const bf = new Browserforce(org, ux);

    console.log('Attempting login...');
    await bf.login();
    console.log('✅ Login successful!');

    // Test getting a new page
    console.log('Testing page creation...');
    const page = await bf.getNewPage();
    console.log('✅ Page created successfully!');
    await page.close();

    // Test navigation
    console.log('Testing navigation...');
    const testPage = await bf.openPage('lightning/setup/SetupOneHome/home');
    console.log('✅ Navigation successful!');
    await testPage.close();

    // Cleanup
    console.log('Cleaning up...');
    await bf.logout();
    console.log('✅ Logout successful!');

    console.log('\n🎉 All login tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLogin();
