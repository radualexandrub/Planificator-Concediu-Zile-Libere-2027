// src/app/app.ts: Main application component
import { AfterViewInit, Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { HOLIDAYS_BY_YEAR, Holiday, YEARS } from './holidays';
import { Footer } from './footer';

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const WEEKDAY_NAMES = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă']; // Date.getDay() order
const WEEKDAY_HEADERS = [
  { long: 'Luni', short: 'Lun' }, { long: 'Marți', short: 'Mar' }, { long: 'Miercuri', short: 'Mie' },
  { long: 'Joi', short: 'Joi' }, { long: 'Vineri', short: 'Vin' }, { long: 'Sâmbătă', short: 'Sâm' },
  { long: 'Duminică', short: 'Dum' },
];
const storageKey = (year: number) => 'zile-libere-' + year;
const YEAR_KEY = 'zile-libere-selected-year';
const DEFAULT_ALLOWANCE = 21;
const DEFAULT_LABEL = 'Concediu';

/** date -> holiday name. Holidays on the same date are merged into one entry. 
 * Example: 2026-01-01 -> "Anul Nou" 
 * or for two conflicting holidays: 2026-06-01 -> "Ziua Copilului, Rusaliile" */
function buildStateDays(holidays: Holiday[]): Map<string, string> {
  const days = new Map<string, string>();
  for (const { date, name } of holidays) {
    const existing = days.get(date);
    if (!existing) days.set(date, name);
    else if (!existing.split(', ').includes(name)) days.set(date, `${existing}, ${name}`);
  }
  return new Map([...days].sort(([a], [b]) => a.localeCompare(b)));
}

const STATE_DAYS_BY_YEAR = new Map(YEARS.map(year =>
  [year, buildStateDays(HOLIDAYS_BY_YEAR[year])] as const));

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
const shortMonth = (m: number) => MONTHS[m].slice(0, 3);

interface Row { iso: string; label: string; weekday: string; weekend: boolean; name: string; }
interface UserDay { iso: string; label: string; }
interface YearPlan { total: number; days: UserDay[]; }
interface Cell {
  iso: string; 
  day: number; 
  month: number; 
  monthShort: string; 
  odd: boolean; 
  inYear: boolean;
  weekend: boolean; 
  state?: string; 
  userLabel?: string; 
  first: boolean; 
  last: boolean;
}
interface CalRow { key: string; month?: MonthStat; cells?: Cell[]; }
interface MonthStat { index: number; name: string; daysInMonth: number; work: number; vacation: number; }

function toUserDay(value: unknown): UserDay | null {
  if (typeof value === 'string') return { iso: value, label: DEFAULT_LABEL };
  if (value && 
      typeof value === 'object' && 
      typeof (value as UserDay).iso === 'string') {
    const { iso, label } = value as UserDay;
    return { iso, label: typeof label === 'string' && label.trim() ? label.trim() : DEFAULT_LABEL };
  }
  return null;
}

const byIso = (a: UserDay, b: UserDay) => a.iso.localeCompare(b.iso);

/** Loads a year's free days plan from localStorage,
 *  or returns a fresh plan if none is saved. */
function loadPlan(year: number): YearPlan {
  const plan: YearPlan = { total: DEFAULT_ALLOWANCE, days: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(year)) ?? 'null');
    if (saved && Number.isFinite(saved.total)) plan.total = saved.total;
    if (saved && Array.isArray(saved.days)) {
      plan.days = saved.days
        .map(toUserDay)
        .filter((day: UserDay | null): day is UserDay => day !== null && day.iso.startsWith(`${year}-`))
        .sort(byIso);
    }
  } catch { /* storage unavailable: start fresh */ }
  return plan;
}

/** Restore the last selected year, otherwise prefer the current year when supported. */
function initialYearSelected(): number {
  try {
    const saved = Number(localStorage.getItem(YEAR_KEY));
    if (YEARS.includes(saved)) return saved;
  } catch { /* ignore */ }
  const current = new Date().getFullYear();
  return YEARS.includes(current) ? current : YEARS[YEARS.length - 1];
}

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

  readonly years = YEARS;
  readonly year = signal(initialYearSelected());
  readonly weekdayHeaders = WEEKDAY_HEADERS;

  private readonly plans = signal<Record<number, YearPlan>>(
    Object.fromEntries(YEARS.map(year => [year, loadPlan(year)])));

  readonly message = signal(''); // error shown under the form
  readonly info = signal(''); // success note for ranges
  readonly start = signal('');
  readonly end = signal('');
  readonly label = signal('');
  readonly showBackToTop = signal(false);

  readonly minDate = computed(() => `${this.year()}-01-01`);
  readonly maxDate = computed(() => `${this.year()}-12-31`);

  readonly total = computed(() => this.plans()[this.year()].total);
  readonly userDays = computed(() => this.plans()[this.year()].days);

  readonly stateDays = computed(() => STATE_DAYS_BY_YEAR.get(this.year())!);
  readonly stateRows = computed(() => [...this.stateDays()].map(([iso, name]) => toRow(iso, name)));
  readonly weekendCount = computed(() => this.stateRows().filter(row => row.weekend).length);
  readonly weekdayCount = computed(() => this.stateRows().length - this.weekendCount());

  readonly userRows = computed(() => this.userDays().map(d => toRow(d.iso, d.label)));
  readonly used = computed(() => this.userDays().length);
  readonly remaining = computed(() => this.total() - this.used());
  readonly percentUsed = computed(() => this.total() > 0 ? Math.min(100, (this.used() / this.total()) * 100) : 100);

  /** Working-day numbers for all 12 months. */
  readonly months = computed<MonthStat[]>(() => {
    const year = this.year();
    const stateDays = this.stateDays();
    const user = new Set(this.userDays().map(d => d.iso));
    return MONTHS.map((name, monthFromIdx0) => {
      const daysInMonth = new Date(year, monthFromIdx0 + 1, 0).getDate();
      let work = 0;
      let vacation = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthFromIdx0, day);
        const iso = toIso(date);
        if (!isWeekend(date) && !stateDays.has(iso)) work++;
        if (user.has(iso)) vacation++;
      }
      return { index: monthFromIdx0, name, daysInMonth, work, vacation };
    });
  });

  /**
   * The whole year as one continuous list of Monday-to-Sunday weeks. A banner row (month name and
   * working days) precedes the week that contains the 1st of each month. The first and last week
   * are completed with real days from the neighbouring years, so numbering never has gaps.
   */
  readonly rows = computed<CalRow[]>(() => {
    const year = this.year();
    const stateDays = this.stateDays();
    const months = this.months();
    const user = new Map(this.userDays().map(d => [d.iso, d.label]));
    const firstOfYear = new Date(year, 0, 1);
    const lastOfYear = new Date(year, 11, 31);
    const before = (firstOfYear.getDay() + 6) % 7; // days back to the previous Monday
    const after = (7 - lastOfYear.getDay()) % 7; // days forward to the next Sunday
    const daysInYear = Math.round((lastOfYear.getTime() - firstOfYear.getTime()) / 86_400_000) + 1;

    const rows: CalRow[] = [];
    let week: Cell[] = [];
    for (let i = 0; i < before + daysInYear + after; i++) {
      const date = new Date(year, 0, 1 - before + i);
      const iso = toIso(date);
      const inYear = date.getFullYear() === year;
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      week.push({
        iso,
        day: date.getDate(),
        month: date.getMonth(),
        monthShort: shortMonth(date.getMonth()),
        odd: date.getMonth() % 2 === 1,
        inYear,
        weekend: isWeekend(date),
        state: stateDays.get(iso),
        userLabel: user.get(iso),
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
    effect(() => {
      const plans = this.plans();
      try {
        for (const year of YEARS) {
          localStorage.setItem(storageKey(year), JSON.stringify(plans[year]));
        }
      } catch { /* ignore */ }
    });
    effect(() => {
      try {
        localStorage.setItem(YEAR_KEY, String(this.year()));
      } catch { /* ignore */ }
    });
  }

  /** Applies a change only to the currently selected year's plan. */
  private updatePlan(change: (plan: YearPlan) => Partial<YearPlan>): void {
    const year = this.year();
    this.plans.update(plans => ({ ...plans, [year]: { ...plans[year], ...change(plans[year]) } }));
  }

  selectYear(year: number): void {
    if (!YEARS.includes(year) || year === this.year()) return;
    this.year.set(year);
    this.start.set('');
    this.end.set('');
    this.message.set('');
    this.info.set('');
  }

  /** Choosing a start date also fills the end date, so a single day only needs one pick. */
  setStart(value: string): void {
    this.start.set(value);
    this.end.set(value);
  }

  setEnd(value: string): void {
    this.end.set(value && value < this.start() ? this.start() : value);
  }

  /** Adds every working day between the input form's start and end dates */
  add(): void {
    const start = this.start();
    if (this.addRange(start, this.end() || start, this.label())) {
      this.start.set('');
      this.end.set('');
      this.label.set('');
    }
  }

  /** A free working day of this year that can still be booked */
  canPickFreeDay(selectedCell: Cell): boolean {
    return selectedCell.inYear &&
          !selectedCell.weekend &&
          !selectedCell.state &&
          !selectedCell.userLabel &&
          this.remaining() > 0;
  }

  /** Clicking a free day in the calendar adds it exactly like picking it in the input form */
  addFromCalendar(selectedCell: Cell): void {
    if (this.canPickFreeDay(selectedCell)) {
      this.addRange(selectedCell.iso, selectedCell.iso, this.label());
    }
  }

  /**
   * Shared by the input form and the calendar: adds every working day between start and end
   * (weekends and state holidays are skipped). Returns true when days were added
   */
  private addRange(startDate: string, endDate: string, label: string): boolean {
    this.message.set('');
    this.info.set('');
    const name = label.trim() || DEFAULT_LABEL;
    if (!startDate) return this.failToAddFreeDay('Alege o dată de început.');
    const year = this.year();
    if (!startDate.startsWith(`${year}-`) || !endDate.startsWith(`${year}-`))
      return this.failToAddFreeDay(`Alege date din ${year}.`);

    const picked: string[] = [];
    let skipped = 0;
    let lastReason = '';
    for (const d = parse(startDate); toIso(d) <= endDate; d.setDate(d.getDate() + 1)) {
      const iso = toIso(d);
      const reason = this.skipReason(iso);
      if (reason) { skipped++; lastReason = reason; } else picked.push(iso);
    }

    const single = startDate === endDate;
    if (!picked.length) {
      return this.failToAddFreeDay(single ? lastReason : 'Intervalul ales nu conține nicio zi lucrătoare disponibilă.');
    }
    if (picked.length > this.remaining()) {
      return this.failToAddFreeDay(this.remaining() <= 0
        ? 'Nu mai ai zile de concediu. Mărește totalul pentru a adăuga alte zile.'
        : `Intervalul are ${picked.length} zile lucrătoare, dar mai ai doar ${this.remaining()} zile de concediu.`);
    }

    this.updatePlan(plan => ({
      days: [...plan.days, ...picked.map(iso => ({ iso, label: name }))].sort(byIso),
    }));
    if (!single) {
      this.info.set(`Au fost adăugate ${picked.length} zile` +
        (skipped ? ` (${skipped} ignorate: weekend, sărbători legale sau zile deja alese).` : '.'));
    }
    return true;
  }

  private failToAddFreeDay(text: string): false {
    this.message.set(text);
    return false;
  }

  /** Removes a previously added free day from the plan. 
   * Can be called from the calendar or from the list of chosen days. */
  remove(iso: string): void {
    this.updatePlan(plan => ({ days: plan.days.filter(day => day.iso !== iso) }));
    this.message.set('');
    this.info.set('');
  }

  updateLabel(iso: string, value: string): void {
    const label = value.trim() || DEFAULT_LABEL;
    this.updatePlan(plan => ({
      days: plan.days.map(day => day.iso === iso ? { ...day, label } : day),
    }));
  }

  setTotal(value: string): void {
    const n = Math.floor(Number(value));
    this.updatePlan(() => ({ total: Number.isFinite(n) && n > 0 ? n : 0 }));
  }

  /** Scrolls so the month banner sits right under the sticky balance bar and weekday header. */
  goTo(index: number): void {
    const el = document.getElementById('month-' + index);
    if (!el) return;
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.balance-bar')?.offsetHeight ?? 0;
    const head = this.host.nativeElement.querySelector<HTMLElement>('.cal thead')?.offsetHeight ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - head, behavior: 'smooth' });
  }

  /**
   * Show back to top arrow.
   * It appears when user is within 1600px from the bottom 
   * and scrolls smoothly to the top when clicked
   */
  @HostListener('window:scroll')
  updateBackToTopVisibility(): void {
    const distanceToBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    this.showBackToTop.set(
      window.scrollY > 0 
      && distanceToBottom <= 1600);
  }

  backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Keeps the sticky weekday header just below the sticky balance bar, whatever height it has. */
  ngAfterViewInit(): void {
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.balance-bar');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    new ResizeObserver(() => this.host.nativeElement.style.setProperty('--bar-h', bar.offsetHeight + 'px')).observe(bar);
  }

  private skipReason(iso: string): string | null {
    if (isWeekend(parse(iso))) return 'Ziua aleasă este în weekend, nu consumă concediu.';
    if (this.stateDays().has(iso)) return 'Ziua aleasă este deja zi liberă legală.';
    if (this.userDays().some(d => d.iso === iso)) return 'Ai ales deja această zi.';
    return null;
  }
}