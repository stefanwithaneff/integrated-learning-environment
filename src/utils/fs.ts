import * as util from "util";
import * as vscode from "vscode";
import { CourseItem, CourseLesson } from "../course-data";

const decoder = new util.TextDecoder("utf-8");

export async function getContentForUri(uri: vscode.Uri): Promise<string> {
  const contentBuffer = await vscode.workspace.fs.readFile(uri);
  return decoder.decode(contentBuffer);
}

function getPathPrefixFromCourseItem(courseItem: CourseItem) {
  if (courseItem instanceof CourseLesson && courseItem.data.pathPrefix) {
    return courseItem.data.pathPrefix;
  }
  return "";
}

export function getUriRelativeToCourseItem(
  courseItem: CourseItem,
  relativePath: string,
  ...additionalPathParts: string[]
): vscode.Uri {
  const configUri = courseItem.configUri;

  return getUriRelativeToConfig(
    configUri,
    getPathPrefixFromCourseItem(courseItem),
    relativePath,
    ...additionalPathParts
  );
}

export function getUriRelativeToConfig(
  configUri: vscode.Uri,
  relativePath: string,
  ...additionalPathParts: string[]
): vscode.Uri {
  return vscode.Uri.joinPath(
    configUri,
    "..",
    relativePath,
    ...additionalPathParts
  );
}

export async function getContentRelativeToConfig(
  configUri: vscode.Uri,
  relativePath: string,
  ...additionalPathParts: string[]
): Promise<{ content: string; uri: vscode.Uri }> {
  const uri = vscode.Uri.joinPath(
    configUri,
    "..",
    relativePath,
    ...additionalPathParts
  );
  const content = await getContentForUri(uri);

  return { content, uri };
}

export async function saveAllOpenTextDocuments(): Promise<void> {
  const dirtyDocuments = vscode.workspace.textDocuments.filter(
    (doc) => doc.isDirty && !doc.isClosed
  );

  for (const doc of dirtyDocuments) {
    const result = await doc.save();

    if (!result) {
      throw new Error(`Failed to save text document: ${doc.uri}`);
    }
  }
}

export function getRootDirectoryForCourseItem(item: CourseItem): vscode.Uri {
  if (!item.parent) {
    return vscode.Uri.joinPath(item.configUri, "..");
  }
  return getRootDirectoryForCourseItem(item.parent);
}
