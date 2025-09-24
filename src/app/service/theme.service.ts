import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type ThemeName = 'theme-light' | 'theme-dark' | 'theme-black';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeKey = 'app-theme';
  private themes: ThemeName[] = ['theme-light', 'theme-dark', 'theme-black'];
  private theme$ = new BehaviorSubject<ThemeName>('theme-light');

  constructor() {
    const saved = (localStorage.getItem(this.themeKey) as ThemeName) || 'theme-light';
    this.applyTheme(saved);
  }

  get current$() { return this.theme$.asObservable(); }
  get current(): ThemeName { return this.theme$.value; }

  setTheme(theme: ThemeName) { this.applyTheme(theme); }
  nextTheme() {
    const idx = this.themes.indexOf(this.theme$.value);
    const next = this.themes[(idx + 1) % this.themes.length];
    this.applyTheme(next);
  }

  private applyTheme(theme: ThemeName) {
    const root = document.documentElement;
    this.themes.forEach(t => root.classList.remove(t));
    root.classList.add('theme-change');
    root.classList.add(theme);
    localStorage.setItem(this.themeKey, theme);
    this.theme$.next(theme);
    // quitar clase de animación después de un corto tiempo
    window.setTimeout(() => root.classList.remove('theme-change'), 350);
  }
}
