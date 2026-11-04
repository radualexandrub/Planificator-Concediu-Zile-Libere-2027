export const YEAR = 2027;

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Romanian legal public holidays for 2027.
export const HOLIDAYS: Holiday[] = [
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
