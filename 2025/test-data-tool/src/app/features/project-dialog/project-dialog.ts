import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { ProjectSetting } from '../../models/project-setting';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-dialog',
  templateUrl: './project-dialog.html',
  styleUrls: ['./project-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ProjectDialogComponent {
  @Output() close = new EventEmitter<void>();
  private readonly projectService = inject(ProjectService);
  readonly projects = this.projectService.projects;
  readonly currentProject = this.projectService.currentProject;

  addProject() {
    this.projectService.addProject();
  }

  deleteProject(id: number | undefined) {
    if (id !== undefined) {
      this.projectService.deleteProject(id);
    }
  }

  selectProject(project: ProjectSetting) {
    this.projectService.selectProject(project);
    this.close.emit();
  }
}
