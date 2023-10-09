import * as Handlebars from "handlebars";

function join(maybeArray: any, separator: any): string {
  if (typeof maybeArray === "string") {
    return maybeArray;
  } else if (!Array.isArray(maybeArray)) {
    return "";
  }

  return maybeArray.join(separator);
}

export function renderTemplate(
  template: string,
  ctx: Record<string, any>
): string {
  const compiledTemplate = Handlebars.compile(template);

  return compiledTemplate(ctx, {
    helpers: {
      join,
    },
  });
}
