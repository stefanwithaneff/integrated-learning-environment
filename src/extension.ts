// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { CourseDataProvider } from "./course-data-provider";
import { CourseItem } from "./course-data";
import { LessonViewProvider } from "./lesson-view-provider";
import { LessonRenderer } from "./lesson-renderer";
import { runTestsForCourseItem } from "./run-tests-for-course-item";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const courseDataProvider = new CourseDataProvider(
    vscode.workspace.workspaceFolders || []
  );

  const lessonViewProvider = new LessonViewProvider();
  const lessonRenderer = new LessonRenderer(lessonViewProvider);

  const treeView = vscode.window.createTreeView(
    "integratedLearningEnvironment",
    {
      treeDataProvider: courseDataProvider,
      canSelectMany: false,
    }
  );

  treeView.onDidChangeSelection((event) => {
    if (event.selection.length === 0) {
      return;
    }
    lessonRenderer.viewLessonContent(event.selection[0]);
  });

  const refreshCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.refreshData",
    () => courseDataProvider.refresh()
  );

  const viewCourseItemCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.viewCourseItem",
    (item: CourseItem) => {
      lessonRenderer.viewLessonContent(item);
    }
  );

  const runCourseItemTestsCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.runCourseItemTests",
    async () => {
      const currentCourseItem = treeView.selection[0];
      await runTestsForCourseItem(context, currentCourseItem);

      // Refresh course data provider to pick up new test status
      courseDataProvider.refresh();
    }
  );

  context.subscriptions.push(
    refreshCommand,
    viewCourseItemCommand,
    runCourseItemTestsCommand
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
