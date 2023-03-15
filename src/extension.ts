// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { CourseDataProvider, CourseItem } from "./course-data-provider";
import { LessonViewProvider } from "./lesson-view-provider";
import { viewLessonContentCommandFactory } from "./commands/view-lesson-content";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const courseDataProvider = new CourseDataProvider(
    vscode.workspace.workspaceFolders || []
  );

  const lessonViewProvider = new LessonViewProvider();
  const viewLessonContentCommand =
    viewLessonContentCommandFactory(lessonViewProvider);

  const treeView = vscode.window.createTreeView(
    "integratedLearningEnvironment",
    {
      treeDataProvider: courseDataProvider,
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.refreshData",
    () => courseDataProvider.refresh()
  );

  const viewCourseItemCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.viewCourseItem",
    (item: CourseItem) => {
      viewLessonContentCommand(item);
    }
  );

  context.subscriptions.push(refreshCommand, viewCourseItemCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
