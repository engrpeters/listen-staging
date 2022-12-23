module.export({
  isWindowsLikeFilesystem: () => isWindowsLikeFilesystem,
  toPosixPath: () => toPosixPath,
  convertToPosixPath: () => convertToPosixPath,
  toDosPath: () => toDosPath,
  convertToWindowsPath: () => convertToWindowsPath,
  convertToOSPath: () => convertToOSPath,
  convertToStandardPath: () => convertToStandardPath,
  convertToOSLineEndings: () => convertToOSLineEndings,
  convertToStandardLineEndings: () => convertToStandardLineEndings,
  unicodeNormalizePath: () => unicodeNormalizePath,
  wrapPathFunction: () => wrapPathFunction,
  pathJoin: () => pathJoin,
  pathNormalize: () => pathNormalize,
  pathRelative: () => pathRelative,
  pathResolve: () => pathResolve,
  pathDirname: () => pathDirname,
  pathBasename: () => pathBasename,
  pathExtname: () => pathExtname,
  pathIsAbsolute: () => pathIsAbsolute,
  pathSep: () => pathSep,
  pathDelimiter: () => pathDelimiter,
  pathOsDelimiter: () => pathOsDelimiter
});
let assert;
module.link("assert", {
  "*"(v) {
    assert = v;
  }

}, 0);
let path;
module.link("path", {
  "*"(v) {
    path = v;
  }

}, 1);
let release, EOL;
module.link("os", {
  release(v) {
    release = v;
  },

  EOL(v) {
    EOL = v;
  }

}, 2);

function isWindowsLikeFilesystem() {
  return process.platform === "win32" || release().indexOf("Microsoft") >= 0;
}

function toPosixPath(p, partialPath) {
  // Sometimes, you can have a path like \Users\IEUser on windows, and this
  // actually means you want C:\Users\IEUser
  if (p[0] === "\\" && !partialPath) {
    p = process.env.SystemDrive + p;
  }

  p = p.replace(/\\/g, '/');

  if (p[1] === ':' && !partialPath) {
    // transform "C:/bla/bla" to "/c/bla/bla"
    p = '/' + p[0] + p.slice(2);
  }

  return p;
}

const convertToPosixPath = toPosixPath;

function toDosPath(p, partialPath) {
  if (p[0] === '/' && !partialPath) {
    if (!/^\/[A-Za-z](\/|$)/.test(p)) throw new Error("Surprising path: " + p); // transform a previously windows path back
    // "/C/something" to "c:/something"

    p = p[1] + ":" + p.slice(2);
  }

  p = p.replace(/\//g, '\\');
  return p;
}

const convertToWindowsPath = toDosPath;

function convertToOSPath(standardPath, partialPath) {
  if (process.platform === "win32") {
    return toDosPath(standardPath, partialPath);
  }

  return standardPath;
}

function convertToStandardPath(osPath, partialPath) {
  if (process.platform === "win32") {
    return toPosixPath(osPath, partialPath);
  }

  return osPath;
}

function convertToOSLineEndings(fileContents) {
  return fileContents.replace(/\n/g, EOL);
}

function convertToStandardLineEndings(fileContents) {
  // Convert all kinds of end-of-line chars to linuxy "\n".
  return fileContents.replace(new RegExp("\r\n", "g"), "\n").replace(new RegExp("\r", "g"), "\n");
}

function unicodeNormalizePath(path) {
  return path ? path.normalize('NFC') : path;
}

function wrapPathFunction(name, partialPaths) {
  const f = path[name];
  assert.strictEqual(typeof f, "function");
  return function () {
    if (process.platform === 'win32') {
      const args = Array.prototype.map.call(arguments, // if partialPaths is turned on (for path.join mostly)
      // forget about conversion of absolute paths for Windows
      p => toDosPath(p, partialPaths));
      const result = f.apply(path, args);

      if (typeof result === "string") {
        return toPosixPath(result, partialPaths);
      }

      return result;
    }

    return f.apply(path, arguments);
  };
}

const pathJoin = wrapPathFunction("join", true);
const pathNormalize = wrapPathFunction("normalize");
const pathRelative = wrapPathFunction("relative");
const pathResolve = wrapPathFunction("resolve");
const pathDirname = wrapPathFunction("dirname");
const pathBasename = wrapPathFunction("basename");
const pathExtname = wrapPathFunction("extname");
const pathIsAbsolute = wrapPathFunction("isAbsolute");
const pathSep = '/';
const pathDelimiter = ':';
const pathOsDelimiter = path.delimiter;
//# sourceMappingURL=mini-files.js.map