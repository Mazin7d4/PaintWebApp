import { cloneProject } from './project.js';
import type { PaintProject } from './types.js';

/** Simple undo/redo stack for editor and scripted sessions */
export class HistoryStack {
  private undoStack: PaintProject[] = [];
  private redoStack: PaintProject[] = [];
  private current: PaintProject;
  private limit: number;

  constructor(project: PaintProject, limit = 100) {
    this.current = cloneProject(project);
    this.limit = limit;
  }

  get project(): PaintProject {
    return this.current;
  }

  /** Commit a mutation produced by mutator(current clone) */
  commit(mutator: (draft: PaintProject) => void): PaintProject {
    this.undoStack.push(cloneProject(this.current));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    const draft = cloneProject(this.current);
    mutator(draft);
    this.current = draft;
    return this.current;
  }

  replace(project: PaintProject, record = true): PaintProject {
    if (record) {
      this.undoStack.push(cloneProject(this.current));
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack = [];
    }
    this.current = cloneProject(project);
    return this.current;
  }

  undo(): PaintProject | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(cloneProject(this.current));
    this.current = prev;
    return this.current;
  }

  redo(): PaintProject | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(cloneProject(this.current));
    this.current = next;
    return this.current;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
