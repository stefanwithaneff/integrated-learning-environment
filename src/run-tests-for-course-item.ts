import { CourseItem, CourseLesson, CourseSubmodule } from "./course-data";
import {
  getContentForUri,
  getRootDirectoryForCourseItem,
  getUriRelativeToConfig,
} from "./utils/fs";
import * as childProcess from "child_process";
import * as vscode from "vscode";
import { Parser } from "tap-parser";
import { renderTemplate } from "./template-renderer";

function getTestCommand(
  context: vscode.ExtensionContext,
  courseItem: CourseItem
): string {
  if (courseItem instanceof CourseSubmodule) {
    if (!courseItem.data.testCommand) {
      if (!courseItem.parent) {
        return getDefaultTestCommand(context);
      }
      return getTestCommand(context, courseItem.parent);
    }
    return courseItem.data.testCommand;
  } else if (courseItem instanceof CourseLesson) {
    return getTestCommand(context, courseItem.parent);
  }

  return getDefaultTestCommand(context);
}

function getDefaultTestCommand(context: vscode.ExtensionContext): string {
  return `${context.asAbsolutePath(
    "./node_modules/.bin/mocha"
  )} --reporter=tap {{join filePaths ' '}} > {{outputPath}}`;
}

export async function runTestsForCourseItem(
  context: vscode.ExtensionContext,
  courseItem: CourseItem
) {
  if (
    courseItem instanceof CourseLesson &&
    courseItem.data.testFilePaths &&
    courseItem.data.testFilePaths.length > 0
  ) {
    const testCommand = getTestCommand(context, courseItem);

    const outputDirectory = getUriRelativeToConfig(
      courseItem.configUri,
      courseItem.data.testOutputDirectory ?? "./__test_output__/"
    );

    await vscode.workspace.fs.createDirectory(outputDirectory);

    const outputUri = vscode.Uri.joinPath(outputDirectory, "./results.tap");

    const filePaths = courseItem.data.testFilePaths.map(
      (path) => getUriRelativeToConfig(courseItem.configUri, path).fsPath
    );

    const renderedCommand = renderTemplate(testCommand, {
      filePaths,
      outputPath: outputUri.fsPath,
    });

    try {
      const buffer = childProcess.execSync(renderedCommand, {
        cwd: getRootDirectoryForCourseItem(courseItem).fsPath,
      });
    } catch (e: any) {
      if (!e.output) {
        throw new Error(`Error running test command: ${e.message}`);
      }
    }

    const tapOutput = await getContentForUri(outputUri);
    const testResults = Parser.parse(tapOutput);
    console.log("Test output >>>", JSON.stringify(testResults, null, 2));
  }
}
