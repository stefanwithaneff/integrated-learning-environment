import * as util from "util";
import * as vscode from "vscode";

const decoder = new util.TextDecoder("utf-8");

export async function getContentForUri(uri: vscode.Uri): Promise<string> {
  const contentBuffer = await vscode.workspace.fs.readFile(uri);
  return decoder.decode(contentBuffer);
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
