import * as vscode from "vscode";

export interface SubmoduleConfig {
  type: "submodule";
  title: string;
  path: string;
}

export interface LessonConfig {
  type: "lesson";
  title: string;
  contentType: string;
  contentPath: string;
  exerciseFilePaths?: string[];
  testFilePaths?: string[];
  testOutputDirectory?: string;
}

type ElementConfig = LessonConfig | SubmoduleConfig;

export interface CourseModule {
  title: string;
  modules: ElementConfig[];
  testCommand?: string;
}

export abstract class CourseItem extends vscode.TreeItem {
  public parent?: CourseItem;

  constructor(
    public configUri: vscode.Uri,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

export class CourseLesson extends CourseItem {
  constructor(
    public configUri: vscode.Uri,
    public data: LessonConfig,
    public parent: CourseItem
  ) {
    super(configUri, data.title, vscode.TreeItemCollapsibleState.None);
  }
}

export class CourseSubmodule extends CourseItem {
  constructor(
    public configUri: vscode.Uri,
    public data: CourseModule,
    public parent?: CourseItem
  ) {
    super(configUri, data.title, vscode.TreeItemCollapsibleState.Collapsed);
  }
}
