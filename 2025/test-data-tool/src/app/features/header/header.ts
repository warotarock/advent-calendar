import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { ProjectDialogComponent } from '../project-dialog/project-dialog';
import { DropdownMenuComponent } from './dropdown-menu';
import { ProjectService } from '../../services/project.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectDialogComponent, DropdownMenuComponent, FormsModule],
})
export class HeaderComponent {
  private readonly projectService = inject(ProjectService);
  readonly currentProject = this.projectService.currentProject;
  readonly projectName = computed(() => this.currentProject()?.name ?? '');
  isProjectDialogOpen = signal(false);
  isDropdownOpen = signal(false);
  isSaving = signal(false);
  showSaveComplete = signal(false);
  fadingOut = signal(false);

  toggleDropdown() {
    this.isDropdownOpen.update((value) => !value);
  }

  openProjectDialog() {
    this.isDropdownOpen.set(false);
    this.isProjectDialogOpen.set(true);
  }

  closeProjectDialog() {
    this.isProjectDialogOpen.set(false);
  }

  saveProjectName(newName: string) {
    const project = this.currentProject();
    if (project) {
      this.projectService.updateProject({ ...project, name: newName });
    }
  }

  async saveProject() {
    this.isDropdownOpen.set(false);

    try {
      this.isSaving.set(true);
      await this.projectService.saveProject();

      // 保存完了の表示に切り替え
      this.isSaving.set(false);
      this.showSaveComplete.set(true);
      this.fadingOut.set(false);

      // Start fade out after 1.7 seconds (show for full duration then fade)
      setTimeout(() => {
        this.fadingOut.set(true);
      }, 1700);

      // Hide completely after fade out animation completes
      setTimeout(() => {
        this.showSaveComplete.set(false);
        this.fadingOut.set(false);
      }, 2000);
    } catch (error) {
      console.error('プロジェクトの保存に失敗しました:', error);
      this.isSaving.set(false);
      // エラー処理やユーザーへの通知を追加可能
    }
  }
}
