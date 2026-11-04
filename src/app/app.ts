import { Component, computed, effect, signal } from '@angular/core';
import { HOLIDAYS, YEAR } from './holidays';

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const WEEKDAY_NAMES = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă']; // Date.getDay() order
const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];
const STORAGE_KEY = 'zile-libere-' + YEAR;
const DEFAULT_ALLOWANCE = 21;

const STATE_DAYS = new Map(HOLIDAYS.map(h => [h.date, h.name]));

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (month: number, day: number) => `${YEAR}-${pad(month + 1)}-${pad(day)}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

interface Row { iso: string; label: string; weekday: string; weekend: boolean; name: string; }
interface Cell { day: number; weekend: boolean; state?: string; user: boolean; }
interface MonthView { index: number; name: string; weeks: (Cell | null)[][]; daysInMonth: number; work: number; vacation: number; }

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

  readonly stateRows = HOLIDAYS.map(h => toRow(h.date, h.name));
  readonly weekendCount = this.stateRows.filter(r => r.weekend).length;
  readonly weekdayCount = this.stateRows.length - this.weekendCount;

  readonly userRows = computed(() => this.userDays().map(iso => toRow(iso, 'Concediu')));
  readonly used = computed(() => this.userDays().length);
  readonly remaining = computed(() => this.total() - this.used());
  readonly percentUsed = computed(() => this.total() > 0 ? Math.min(100, (this.used() / this.total()) * 100) : 100);

  readonly months = computed<MonthView[]>(() => {
    const user = new Set(this.userDays());
    return MONTHS.map((name, m) => {
      const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
      const offset = (new Date(YEAR, m, 1).getDay() + 6) % 7; // week starts on Monday
      const cells: (Cell | null)[] = Array(offset).fill(null);
      let work = 0;
      let vacation = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = toIso(m, day);
        const weekend = isWeekend(new Date(YEAR, m, day));
        const state = STATE_DAYS.get(iso);
        const isUser = user.has(iso);
        if (!weekend && !state) work++;
        if (isUser) vacation++;
        cells.push({ day, weekend, state, user: isUser });
      }
      while (cells.length % 7) cells.push(null);
      const weeks: (Cell | null)[][] = [];
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
      return { index: m, name, weeks, daysInMonth, work, vacation };
    });
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

  goTo(monthIndex: number): void {
    document.getElementById('month-' + monthIndex)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
