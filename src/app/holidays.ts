// src/app/holidays.ts: Romanian legal public holidays, per year
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Romanian legal public holidays for 2026.
const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Anul Nou' },
  { date: '2026-01-02', name: 'Anul Nou' },
  { date: '2026-01-06', name: 'Boboteaza' },
  { date: '2026-01-07', name: 'Sfântul Ioan Botezătorul' },
  { date: '2026-01-24', name: 'Ziua Unirii Principatelor Române' },
  { date: '2026-04-10', name: 'Vinerea Mare' },
  { date: '2026-04-12', name: 'Paștele' },
  { date: '2026-04-13', name: 'Paștele' },
  { date: '2026-05-01', name: 'Ziua Muncii' },
  { date: '2026-05-31', name: 'Rusaliile' },
  { date: '2026-06-01', name: 'Ziua Copilului' },
  { date: '2026-06-01', name: 'Rusaliile' },
  { date: '2026-08-15', name: 'Adormirea Maicii Domnului' },
  { date: '2026-11-30', name: 'Sfântul Andrei' },
  { date: '2026-12-01', name: 'Ziua Națională a României' },
  { date: '2026-12-25', name: 'Crăciunul' },
  { date: '2026-12-26', name: 'Crăciunul' },
];

// Romanian legal public holidays for 2027.
const HOLIDAYS_2027: Holiday[] = [
  { date: '2027-01-01', name: 'Anul Nou' },
  { date: '2027-01-02', name: 'Anul Nou' },
  { date: '2027-01-06', name: 'Boboteaza' },
  { date: '2027-01-07', name: 'Sfântul Ioan Botezătorul' },
  { date: '2027-01-24', name: 'Ziua Unirii Principatelor Române' },
  { date: '2027-04-30', name: 'Vinerea Mare' },
  { date: '2027-05-01', name: 'Ziua Muncii' },
  { date: '2027-05-02', name: 'Paștele' },
  { date: '2027-05-03', name: 'Paștele' },
  { date: '2027-06-01', name: 'Ziua Copilului' },
  { date: '2027-06-20', name: 'Rusaliile' },
  { date: '2027-06-21', name: 'Rusaliile' },
  { date: '2027-08-15', name: 'Adormirea Maicii Domnului' },
  { date: '2027-11-30', name: 'Sfântul Andrei' },
  { date: '2027-12-01', name: 'Ziua Națională a României' },
  { date: '2027-12-25', name: 'Crăciunul' },
  { date: '2027-12-26', name: 'Crăciunul' },
];

/** Add a year's holidays here to enable its tab, calendar, and saved plan. */
export const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2026: HOLIDAYS_2026,
  2027: HOLIDAYS_2027,
};

export const YEARS = Object.keys(HOLIDAYS_BY_YEAR).map(Number).sort((a, b) => a - b);
