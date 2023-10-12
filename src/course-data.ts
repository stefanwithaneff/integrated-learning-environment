import * as vscode from "vscode";
import { getResultsFromTapOutput, TestOutput } from "./tap-parser";

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
  pathPrefix?: string;
}

type ElementConfig = LessonConfig | SubmoduleConfig;

export interface CourseModule {
  title: string;
  modules?: ElementConfig[];
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

enum LessonStatus {
  EMPTY = "EMPTY",
  ERROR = "ERROR",
  PASSED = "PASSED",
}

const iconForStatus: Record<LessonStatus, vscode.ThemeIcon> = {
  [LessonStatus.EMPTY]: new vscode.ThemeIcon("circle-large-outline"),
  [LessonStatus.ERROR]: new vscode.ThemeIcon("stop"),
  [LessonStatus.PASSED]: new vscode.ThemeIcon("pass-filled"),
};

export class CourseLesson extends CourseItem {
  testResults?: TestOutput[];
  lessonStatus: LessonStatus = LessonStatus.EMPTY;
  constructor(
    public configUri: vscode.Uri,
    public data: LessonConfig,
    public parent: CourseItem
  ) {
    super(configUri, data.title, vscode.TreeItemCollapsibleState.None);
  }

  async loadLessonStatus() {
    const assertions = await getResultsFromTapOutput(this);
    this.testResults = assertions;

    if (assertions.length === 0) {
      this.lessonStatus = LessonStatus.EMPTY;
    } else if (assertions.every((assertion) => assertion.succeeded)) {
      this.lessonStatus = LessonStatus.PASSED;
    } else {
      this.lessonStatus = LessonStatus.ERROR;
    }

    this.setIconForLessonStatus();
  }

  setIconForLessonStatus() {
    this.iconPath = iconForStatus[this.lessonStatus];
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
