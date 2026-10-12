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

  private txBase: PaintProject | null = null;

  /** Start a live edit (e.g. a drag). Updates during it are not recorded individually. */
  begin(): void {
    if (!this.txBase) this.txBase = cloneProject(this.current);
  }

  /** Mutate the live edit, starting from the state captured by begin(). */
  update(mutator: (draft: PaintProject) => void): PaintProject {
    if (!this.txBase) this.begin();
    const draft = cloneProject(this.txBase as PaintProject);
    mutator(draft);
    this.current = draft;
    return this.current;
  }

  get inTransaction(): boolean {
    return this.txBase !== null;
  }

  /** Finish the live edit as ONE undo step (no-op if nothing changed). */
  end(): boolean {
    const base = this.txBase;
    this.txBase = null;
    if (!base) return false;
    if (JSON.stringify(base) === JSON.stringify(this.current)) return false;
    this.undoStack.push(base);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  /** Abort the live edit and restore the state from begin(). */
  cancel(): void {
    if (this.txBase) this.current = this.txBase;
    this.txBase = null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
