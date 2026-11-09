import { Component, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faMoon, faPaintBrush } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-footer',
  imports: [FontAwesomeModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit {
  readonly faGithub = faGithub;
  readonly faMoon = faMoon;
  readonly faPaintBrush = faPaintBrush;
  accentColor = 'hsl(150, 28%, 24%)'; // Default accent color

  ngOnInit(): void {
    const storedTheme = localStorage.getItem('theme');
    const theme = storedTheme === 'dark' ? 'dark' : 'light';

    if (storedTheme !== theme) {
      localStorage.setItem('theme', theme);
    }

    document.documentElement.setAttribute('data-theme', theme);

    const storedAccentColor = localStorage.getItem('accent-color');
    if (storedAccentColor && /^#[\da-f]{6}$/i.test(storedAccentColor)) {
      this.accentColor = storedAccentColor;
      this.applyAccentColor(storedAccentColor);
    }
  }

  onToggleDarkTheme(): void {
    const theme = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  onToggleAccentColor(): void {
    document.getElementById('accentColorInput')?.click();
  }

  onChangeAccentColor(colorValueEvent: Event): void {
    const input = colorValueEvent.target;
    if (!(input instanceof HTMLInputElement)) return;

    this.accentColor = input.value;
    localStorage.setItem('accent-color', this.accentColor);
    this.applyAccentColor(this.accentColor);
  }

  private applyAccentColor(color: string): void {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--primary', color);
    rootStyle.setProperty('--hue-primary', String(this.colorToHue(color)));
  }

  private colorToHue(color: string): number {
    const red = parseInt(color.slice(1, 3), 16) / 255;
    const green = parseInt(color.slice(3, 5), 16) / 255;
    const blue = parseInt(color.slice(5, 7), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    if (delta === 0) return 0;

    let hue: number;
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }

    return (hue + 360) % 360;
  }
}
