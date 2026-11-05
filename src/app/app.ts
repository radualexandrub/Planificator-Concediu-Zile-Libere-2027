import { Component, computed, effect, signal } from '@angular/core';
import { HOLIDAYS, YEAR } from './holidays';

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const WEEKDAY_NAMES = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă']; // Date.getDay() order
const WEEKDAY_HEADERS = [
  { long: 'Luni', short: 'Lun' }, { long: 'Marți', short: 'Mar' }, { long: 'Miercuri', short: 'Mie' },
  { long: 'Joi', short: 'Joi' }, { long: 'Vineri', short: 'Vin' }, { long: 'Sâmbătă', short: 'Sâm' },
  { long: 'Duminică', short: 'Dum' },
];
const STORAGE_KEY = 'zile-libere-' + YEAR;
const DEFAULT_ALLOWANCE = 21;

const STATE_DAYS = new Map(HOLIDAYS.map(h => [h.date, h.name]));

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
const shortMonth = (m: number) => MONTHS[m].slice(0, 3);

interface Row { iso: string; label: string; weekday: string; weekend: boolean; name: string; }
interface Cell {
  iso: string; day: number; monthShort: string; odd: boolean; inYear: boolean;
  weekend: boolean; state?: string; user: boolean; first: boolean; last: boolean;
}
interface MonthStat { index: number; name: string; daysInMonth: number; work: number; vacation: number; }

function toRow(iso: string, name: string): Row {
  const date = parse(iso);
  return {
    iso,
    label: `${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()}`,
    weekday: WEEKDAY_NAMES[date.getDay()],
    weekend: isWeekend(date),
    name,
  };
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly year = YEAR;
  readonly minDate = `${YEAR}-01-01`;
  readonly maxDate = `${YEAR}-12-31`;
  readonly weekdayHeaders = WEEKDAY_HEADERS;

  readonly total = signal(DEFAULT_ALLOWANCE);
  readonly userDays = signal<string[]>([]);
  readonly message = signal('');
  readonly viewMonth = signal(0);

  readonly stateRows = HOLIDAYS.map(h => toRow(h.date, h.name));
  readonly weekendCount = this.stateRows.filter(r => r.weekend).length;
  readonly weekdayCount = this.stateRows.length - this.weekendCount;

  readonly userRows = computed(() => this.userDays().map(iso => toRow(iso, 'Concediu')));
  readonly used = computed(() => this.userDays().length);
  readonly remaining = computed(() => this.total() - this.used());
  readonly percentUsed = computed(() => this.total() > 0 ? Math.min(100, (this.used() / this.total()) * 100) : 100);

  /** Working-day numbers for all 12 months. */
  readonly months = computed<MonthStat[]>(() => {
    const user = new Set(this.userDays());
    return MONTHS.map((name, m) => {
      const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
      let work = 0;
      let vacation = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(YEAR, m, day);
        const iso = toIso(date);
        if (!isWeekend(date) && !STATE_DAYS.has(iso)) work++;
        if (user.has(iso)) vacation++;
      }
      return { index: m, name, daysInMonth, work, vacation };
    });
  });

  readonly current = computed(() => this.months()[this.viewMonth()]);

  /**
   * The weeks of the selected month, Monday to Sunday. The first and last week are completed with
   * the real days of the neighbouring months, so numbering never has gaps across a month boundary.
   */
  readonly weeks = computed<Cell[][]>(() => {
    const m = this.viewMonth();
    const user = new Set(this.userDays());
    const firstOfMonth = new Date(YEAR, m, 1);
    const lastOfMonth = new Date(YEAR, m + 1, 0);
    const before = (firstOfMonth.getDay() + 6) % 7; // days back to the previous Monday
    const after = (7 - lastOfMonth.getDay()) % 7; // days forward to the next Sunday
    const count = before + lastOfMonth.getDate() + after;

    const weeks: Cell[][] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(YEAR, m, 1 - before + i);
      const iso = toIso(date);
      const inYear = date.getFullYear() === YEAR;
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      if (i % 7 === 0) weeks.push([]);
      weeks[weeks.length - 1].push({
        iso,
        day: date.getDate(),
        monthShort: shortMonth(date.getMonth()),
        odd: date.getMonth() % 2 === 1,
        inYear,
        weekend: isWeekend(date),
        state: STATE_DAYS.get(iso),
        user: user.has(iso),
        first: inYear && date.getDate() === 1,
        last: inYear && date.getDate() === lastDay,
      });
    }
    return weeks;
  });

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved && Number.isFinite(saved.total)) this.total.set(saved.total);
      if (saved && Array.isArray(saved.days)) {
        this.userDays.set(saved.days.filter((d: unknown) => typeof d === 'string' && d.startsWith(`${YEAR}-`)));
      }
    } catch { /* storage unavailable: start fresh */ }

    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ total: this.total(), days: this.userDays() }));
      } catch { /* ignore */ }
    });
  }

  add(input: HTMLInputElement): void {
    const error = this.validate(input.value);
    this.message.set(error ?? '');
    if (error) return;
    this.userDays.update(days => [...days, input.value].sort());
    input.value = '';
  }

  remove(iso: string): void {
    this.userDays.update(days => days.filter(d => d !== iso));
    this.message.set('');
  }

  setTotal(value: string): void {
    const n = Math.floor(Number(value));
    this.total.set(Number.isFinite(n) && n > 0 ? n : 0);
  }

  selectMonth(index: number): void {
    this.viewMonth.set(index);
  }

  step(delta: number): void {
    this.viewMonth.update(m => Math.min(11, Math.max(0, m + delta)));
  }

  private validate(iso: string): string | null {
    if (!iso || !iso.startsWith(`${YEAR}-`)) return `Alege o dată din ${YEAR}.`;
    if (isWeekend(parse(iso))) return 'Ziua aleasă este în weekend, nu consumă concediu.';
    if (STATE_DAYS.has(iso)) return 'Ziua aleasă este deja zi liberă legală.';
    if (this.userDays().includes(iso)) return 'Ai ales deja această zi.';
    if (this.remaining() <= 0) return 'Nu mai ai zile de concediu. Mărește totalul pentru a adăuga alte zile.';
    return null;
  }
}