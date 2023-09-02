import {
  CourseItem,
  CourseLesson,
  CourseSubmodule,
} from "./course-data-provider";
import {
  getContentForUri,
  getRootDirectoryForCourseItem,
  getUriRelativeToConfig,
} from "./utils/fs";
import * as childProcess from "child_process";
import * as vscode from "vscode";
import { Parser } from "tap-parser";

function getTestCommand(courseItem: CourseItem): string | undefined {
  if (courseItem instanceof CourseSubmodule) {
    if (!courseItem.data.testCommand) {
      if (!courseItem.parent) {
        return;
      }
      return getTestCommand(courseItem.parent);
    }
    return courseItem.data.testCommand;
  } else if (courseItem instanceof CourseLesson) {
    return getTestCommand(courseItem.parent);
  }
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
    const testCommand = getTestCommand(courseItem);
    if (!testCommand) {
      const outputDirectory = getUriRelativeToConfig(
        courseItem.configUri,
        courseItem.data.testOutputPath ?? "./__test_output__/"
      );

      await vscode.workspace.fs.createDirectory(outputDirectory);

      const outputUri = vscode.Uri.joinPath(outputDirectory, "./results.tap");

      const filePaths = courseItem.data.testFilePaths.map(
        (path) => getUriRelativeToConfig(courseItem.configUri, path).fsPath
      );

      try {
        childProcess.execSync(
          `${context.asAbsolutePath(
            "./node_modules/.bin/mocha"
          )} --reporter=tap ${filePaths.join(" ")} > ${outputUri.fsPath}`,
          { cwd: getRootDirectoryForCourseItem(courseItem).fsPath }
        );
      } catch (e: any) {
        if (!e.output) {
          throw new Error(`Error running test command: ${e.message}`);
        }
      }

      const tapOutput = await getContentForUri(outputUri);
      const testResults = Parser.parse(tapOutput);
      console.log(JSON.stringify(testResults, null, 2));
    }
  }
}
