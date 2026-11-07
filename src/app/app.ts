import { AfterViewInit, Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { HOLIDAYS, YEAR } from './holidays';
import { Footer } from './footer';

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
  iso: string; day: number; month: number; monthShort: string; odd: boolean; inYear: boolean;
  weekend: boolean; state?: string; user: boolean; first: boolean; last: boolean;
}
interface CalRow { key: string; month?: MonthStat; cells?: Cell[]; }
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
  imports: [Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly year = YEAR;
  readonly minDate = `${YEAR}-01-01`;
  readonly maxDate = `${YEAR}-12-31`;
  readonly weekdayHeaders = WEEKDAY_HEADERS;

  readonly total = signal(DEFAULT_ALLOWANCE);
  readonly userDays = signal<string[]>([]);
  readonly message = signal(''); // error shown under the form
  readonly info = signal(''); // success note for ranges
  readonly start = signal('');
  readonly end = signal('');

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

  /**
   * The whole year as one continuous list of Monday-to-Sunday weeks. A banner row (month name and
   * working days) precedes the week that contains the 1st of each month. The first and last week
   * are completed with real days from the neighbouring years, so numbering never has gaps.
   */
  readonly rows = computed<CalRow[]>(() => {
    const months = this.months();
    const user = new Set(this.userDays());
    const firstOfYear = new Date(YEAR, 0, 1);
    const lastOfYear = new Date(YEAR, 11, 31);
    const before = (firstOfYear.getDay() + 6) % 7; // days back to the previous Monday
    const after = (7 - lastOfYear.getDay()) % 7; // days forward to the next Sunday
    const daysInYear = Math.round((lastOfYear.getTime() - firstOfYear.getTime()) / 86_400_000) + 1;

    const rows: CalRow[] = [];
    let week: Cell[] = [];
    for (let i = 0; i < before + daysInYear + after; i++) {
      const date = new Date(YEAR, 0, 1 - before + i);
      const iso = toIso(date);
      const inYear = date.getFullYear() === YEAR;
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      week.push({
        iso,
        day: date.getDate(),
        month: date.getMonth(),
        monthShort: shortMonth(date.getMonth()),
        odd: date.getMonth() % 2 === 1,
        inYear,
        weekend: isWeekend(date),
        state: STATE_DAYS.get(iso),
        user: user.has(iso),
        first: inYear && date.getDate() === 1,
        last: inYear && date.getDate() === lastDay,
      });
      if (week.length === 7) {
        const monthStart = week.find(c => c.first);
        if (monthStart) rows.push({ key: 'month-' + monthStart.month, month: months[monthStart.month] });
        rows.push({ key: week[0].iso, cells: week });
        week = [];
      }
    }
    return rows;
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

  /** Choosing a start date also fills the end date, so a single day only needs one pick. */
  setStart(value: string): void {
    this.start.set(value);
    this.end.set(value);
  }

  setEnd(value: string): void {
    this.end.set(value && value < this.start() ? this.start() : value);
  }

  /** Adds every working day between start and end (weekends and state holidays are skipped). */
  add(): void {
    this.message.set('');
    this.info.set('');
    const start = this.start();
    const end = this.end() || start;
    if (!start) return this.message.set('Alege o dată de început.');
    if (!start.startsWith(`${YEAR}-`) || !end.startsWith(`${YEAR}-`)) return this.message.set(`Alege date din ${YEAR}.`);

    const picked: string[] = [];
    let skipped = 0;
    let lastReason = '';
    for (const d = parse(start); toIso(d) <= end; d.setDate(d.getDate() + 1)) {
      const iso = toIso(d);
      const reason = this.skipReason(iso);
      if (reason) { skipped++; lastReason = reason; } else picked.push(iso);
    }

    const single = start === end;
    if (!picked.length) {
      return this.message.set(single ? lastReason : 'Intervalul ales nu conține nicio zi lucrătoare disponibilă.');
    }
    if (picked.length > this.remaining()) {
      return this.message.set(this.remaining() <= 0
        ? 'Nu mai ai zile de concediu. Mărește totalul pentru a adăuga alte zile.'
        : `Intervalul are ${picked.length} zile lucrătoare, dar mai ai doar ${this.remaining()} zile de concediu.`);
    }

    this.userDays.update(days => [...days, ...picked].sort());
    if (!single) {
      this.info.set(`Au fost adăugate ${picked.length} zile` +
        (skipped ? ` (${skipped} ignorate: weekend, sărbători legale sau zile deja alese).` : '.'));
    }
    this.start.set('');
    this.end.set('');
  }

  remove(iso: string): void {
    this.userDays.update(days => days.filter(d => d !== iso));
    this.message.set('');
    this.info.set('');
  }

  setTotal(value: string): void {
    const n = Math.floor(Number(value));
    this.total.set(Number.isFinite(n) && n > 0 ? n : 0);
  }

  /** Scrolls so the month banner sits right under the sticky balance bar and weekday header. */
  goTo(index: number): void {
    const el = document.getElementById('month-' + index);
    if (!el) return;
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.balance-bar')?.offsetHeight ?? 0;
    const head = this.host.nativeElement.querySelector<HTMLElement>('.cal thead')?.offsetHeight ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - head, behavior: 'smooth' });
  }

  /** Keeps the sticky weekday header just below the sticky balance bar, whatever height it has. */
  ngAfterViewInit(): void {
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.balance-bar');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    new ResizeObserver(() => this.host.nativeElement.style.setProperty('--bar-h', bar.offsetHeight + 'px')).observe(bar);
  }

  private skipReason(iso: string): string | null {
    if (isWeekend(parse(iso))) return 'Ziua aleasă este în weekend, nu consumă concediu.';
    if (STATE_DAYS.has(iso)) return 'Ziua aleasă este deja zi liberă legală.';
    if (this.userDays().includes(iso)) return 'Ai ales deja această zi.';
    return null;
  }
}