// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { CourseDataProvider } from "./course-data-provider";
import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
  LessonStatus,
} from "./course-data";
import { LessonViewProvider } from "./lesson-view-provider";
import { LessonRenderer } from "./lesson-renderer";
import { runTestsForCourseItem } from "./run-tests-for-course-item";
import { getNextCourseItem, getPreviousCourseItem } from "./tree-traversal";
import { ExerciseFileProvider } from "./exercise-file-provider";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const courseDataProvider = new CourseDataProvider(
    vscode.workspace.workspaceFolders || []
  );

  const lessonViewProvider = new LessonViewProvider();
  const lessonRenderer = new LessonRenderer(lessonViewProvider, context);

  const learningModulesTreeView = vscode.window.createTreeView(
    "integratedLearningEnvironment.learning-modules-view",
    {
      treeDataProvider: courseDataProvider,
      canSelectMany: false,
    }
  );

  const exerciseFileProvider = new ExerciseFileProvider(
    learningModulesTreeView
  );

  const exerciseFileTreeView = vscode.window.createTreeView(
    "integratedLearningEnvironment.exercise-files-view",
    {
      treeDataProvider: exerciseFileProvider,
    }
  );

  exerciseFileTreeView.onDidChangeSelection(async (event) => {
    const selection = event.selection.at(0);
    if (!selection || selection.type === "directory") {
      return;
    }

    const textDocument = await vscode.workspace.openTextDocument(selection.uri);
    return vscode.window.showTextDocument(textDocument, {
      preview: false, // Prevents the individual files from overriding each other
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.One,
    });
  });

  learningModulesTreeView.onDidChangeSelection(async (event) => {
    if (event.selection.length === 0) {
      return;
    }
    exerciseFileProvider.refresh();
    await lessonRenderer.viewLessonContent(event.selection[0]);
  });

  const refreshCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.refreshData",
    () => {
      courseDataProvider.refresh();
      exerciseFileProvider.refresh();
    }
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
      const currentCourseItem = learningModulesTreeView.selection[0];
      await runTestsForCourseItem(context, currentCourseItem);

      // Refresh course data provider to pick up new test status
      courseDataProvider.refresh();
    }
  );

  const goToNextCourseItemCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.goToNextCourseItem",
    async () => {
      const currentSelection = learningModulesTreeView.selection.at(0);

      const nextItem = await getNextCourseItem(
        courseDataProvider,
        currentSelection
      );

      if (nextItem) {
        await learningModulesTreeView.reveal(nextItem);
      }
    }
  );

  const goToPreviousCourseItemCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.goToPreviousCourseItem",
    async () => {
      const currentSelection = learningModulesTreeView.selection.at(0);

      const previousItem = await getPreviousCourseItem(
        courseDataProvider,
        currentSelection
      );

      if (previousItem) {
        await learningModulesTreeView.reveal(previousItem);
      }
    }
  );

  const resumeCourseCommand = vscode.commands.registerCommand(
    "integratedLearningEnvironment.resumeCourse",
    async () => {
      const currentSelection = learningModulesTreeView.selection.at(0);

      let nextItem = await getNextCourseItem(
        courseDataProvider,
        currentSelection
      );

      while (true) {
        if (nextItem instanceof CourseSubmodule) {
          nextItem = await getNextCourseItem(courseDataProvider, nextItem);
          continue;
        }
        if (nextItem instanceof CourseLesson) {
          if (nextItem.lessonStatus === LessonStatus.PASSED) {
            nextItem = await getNextCourseItem(courseDataProvider, nextItem);
            continue;
          }
          break;
        }
        nextItem = undefined;
        break;
      }

      if (nextItem) {
        await learningModulesTreeView.reveal(nextItem);
      }
    }
  );

  context.subscriptions.push(
    refreshCommand,
    viewCourseItemCommand,
    runCourseItemTestsCommand,
    goToNextCourseItemCommand,
    goToPreviousCourseItemCommand,
    resumeCourseCommand
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
