import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  OnInit,
  Renderer2,
  viewChild,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { HeaderComponent } from './features/header/header';
import { TableDesign } from './features/table-design/table-design';
import { TestDataDesign } from './features/test-data-design/test-data-design';
import { ProjectSetting } from './models/project-setting';
import { IndexedDb } from './services/indexed-db';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, TableDesign, TestDataDesign],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly indexedDb = inject(IndexedDb);
  private renderer = inject(Renderer2);

  leftPane = viewChild<ElementRef<HTMLElement>>('leftPane');
  rightPane = viewChild<ElementRef<HTMLElement>>('rightPane');
  splitter = viewChild<ElementRef<HTMLElement>>('splitter');

  constructor() {
    afterNextRender(() => {
      this.setupSplitter();
    });
  }

  async ngOnInit() {
    const projects = await this.indexedDb.getProjectSettings();
    if (projects.length === 0) {
      const initialProject: ProjectSetting = {
        name: '新しいプロジェクト',
        tableDesigns: [],
        testDataDesigns: [],
      };
      await this.indexedDb.addProjectSetting(initialProject);
    }
  }

  private setupSplitter(): void {
    const splitterEl = this.splitter()?.nativeElement;
    if (!splitterEl) return;

    const leftPaneEl = this.leftPane()?.nativeElement;
    if (!leftPaneEl) return;

    const mouseDown$ = fromEvent<MouseEvent>(splitterEl, 'mousedown');
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');

    mouseDown$
      .pipe(
        map((event) => {
          event.preventDefault();
          const computedStyle = window.getComputedStyle(leftPaneEl);
          let currentFlexBasis: number;

          // flex-basisが%で設定されている場合は、実際のピクセル値に変換
          if (computedStyle.flexBasis.includes('%') && leftPaneEl.parentElement) {
            currentFlexBasis = leftPaneEl.clientWidth;
          } else {
            currentFlexBasis = parseFloat(computedStyle.flexBasis);
          }

          return {
            startX: event.clientX,
            startFlexBasis: currentFlexBasis,
          };
        }),
        switchMap((start) =>
          mouseMove$.pipe(
            map((moveEvent) => {
              moveEvent.preventDefault();
              const dx = moveEvent.clientX - start.startX;
              return start.startFlexBasis + dx;
            }),
            takeUntil(mouseUp$)
          )
        )
      )
      .subscribe((newFlexBasis) => {
        this.renderer.setStyle(leftPaneEl, 'flex-basis', `${newFlexBasis}px`);
      });
  }
}
