import { expect, test } from '@playwright/test';

test.describe('share links', () => {
  test('reports invalid links and removes their parameters from the address bar', async ({ page }) => {
    await page.goto('/?d=abc');

    await expect(page.getByRole('status')).toContainText('Linkul nu conține zile de concediu valide.');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('previews valid shared days and adds them to the current plan by default', async ({ page }) => {
    const params = new URLSearchParams();
    params.append('t2026', '23');
    params.append('d', '2026-12-28_Vacanță cu familia');
    params.append('d', '2026-12-29_Concediu');
    await page.goto(`/?${params.toString()}`);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Import din link' })).toBeVisible();
    await expect(dialog).toContainText('28 decembrie, luni');
    await expect(dialog).toContainText('Vacanță cu familia');
    await expect(dialog.getByLabel('Adaugă la lista curentă')).toBeChecked();
    await expect(page).toHaveURL('/');

    await dialog.getByRole('button', { name: 'Importă' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.user-list tbody tr')).toHaveCount(2);
    await expect(page.locator('.user-list tbody')).toContainText('28 decembrie');
    await expect(page.locator('.user-list tbody')).toContainText('29 decembrie');
  });

  test('overwrites the selected year allowance and vacation days when requested', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('zile-libere-selected-year', '2026');
      localStorage.setItem('zile-libere-2026', JSON.stringify({
        total: 10,
        days: [{ iso: '2026-12-30', label: 'Zi existentă' }],
      }));
    });

    await page.goto('/?t2026=23&d=2026-12-28_Vacanță');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Suprascrie lista curentă').check();
    await dialog.getByRole('button', { name: 'Importă' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.user-list tbody tr')).toHaveCount(1);
    await expect(page.locator('.user-list tbody')).toContainText('28 decembrie');
    await expect(page.locator('.user-list tbody')).not.toContainText('30 decembrie');
    await expect(page.locator('.balance-inner')).toContainText('din 23 zile');
  });

  test('generates a current link with days and allowances from every populated year', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('zile-libere-selected-year', '2026');
      localStorage.setItem('zile-libere-2026', JSON.stringify({
        total: 23,
        days: [{ iso: '2026-12-28', label: 'Vacanță cu familia' }],
      }));
      localStorage.setItem('zile-libere-2027', JSON.stringify({
        total: 25,
        days: [{ iso: '2027-05-04', label: 'Liber + special' }],
      }));
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Generează link' }).click();

    const shareUrl = await page.locator('.share-url').innerText();
    const parsedUrl = new URL(shareUrl);
    expect(parsedUrl.searchParams.get('t2026')).toBe('23');
    expect(parsedUrl.searchParams.get('t2027')).toBe('25');
    expect(parsedUrl.searchParams.getAll('d')).toEqual([
      '2026-12-28_Vacanță cu familia',
      '2027-05-04_Liber + special',
    ]);
    await expect(page.getByRole('button', { name: 'Copiază linkul' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/copiat în clipboard|Nu am putut copia automat/);
  });
});
