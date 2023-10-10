import { Parser } from "tap-parser";
import * as vscode from "vscode";
import { CourseItem, CourseLesson } from "./course-data";
import { getUriRelativeToCourseItem, getContentForUri } from "./utils/fs";

export interface TestOutput {
  name: string;
  path: string;
  succeeded: boolean;
}

export function getTestOutputUri(courseItem: CourseLesson): vscode.Uri {
  const outputDirectory = getUriRelativeToCourseItem(
    courseItem,
    courseItem.data.testOutputDirectory ?? "./__test_output__/"
  );

  return vscode.Uri.joinPath(outputDirectory, "./results.tap");
}

type TapParserOutput = [string, any];

function getAllAssertions(results: TapParserOutput[]): TestOutput[] {
  return results
    .map(([eventName, payload]) => {
      if (eventName === "child") {
        return getAllAssertions(payload);
      } else if (eventName === "assert") {
        return [
          {
            name: payload.name as string,
            path: payload.fullname as string,
            succeeded: payload.ok as boolean,
          },
        ];
      }
      return [];
    })
    .flat();
}

export async function getResultsFromTapOutput(
  courseItem: CourseItem
): Promise<TestOutput[]> {
  if (courseItem instanceof CourseLesson) {
    const outputUri = getTestOutputUri(courseItem);
    try {
      const content = await getContentForUri(outputUri);
      const testResults = Parser.parse(content);

      return getAllAssertions(testResults);
    } catch (e) {
      if (e instanceof vscode.FileSystemError.FileNotFound) {
        return [];
      }
      throw e;
    }
  }

  return [];
}
