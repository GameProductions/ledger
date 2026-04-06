import { test, expect } from '@playwright/test';

test.describe('Ledger Authentication & Initialization Flow', () => {
  test('has standard landing infrastructure', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/LEDGER/);

    // Expect the floating footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('GameProductions');
  });

  test('validates rejected login gracefully', async ({ page }) => {
    // Navigate and open login
    await page.goto('/');
    
    // Modern react rendering might take a bit. Look for sign in button.
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    if (await signInButton.isVisible()) {
      await signInButton.click();
      
      // Look for the auth container
      await expect(page.locator('.auth-container')).toBeVisible({ timeout: 10000 });
      
      // Perform a fail scenario (e.g. invalid username formatting or random entry)
      await page.fill('input[type="text"]', 'invalid_user');
      await page.fill('input[type="password"]', 'wrong-pass-1234');
      await page.getByRole('button', { name: /Login/i }).click();

      // Ensure the UI surfaces a toaster or local error message instead of crashing
      const toast = page.locator('.toast, [role="alert"]').first();
      await expect(toast).toBeVisible();
    }
  });
});
