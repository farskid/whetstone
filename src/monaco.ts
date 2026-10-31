// Bundle Monaco locally (no CDN) and wire its web workers through Vite.
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

(self as any).MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

const ts = monaco.typescript;
const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  lib: ['es2023', 'dom'],
  strict: true,
  noImplicitAny: true,
  allowNonTsExtensions: true,
  noEmit: true,
};
ts.typescriptDefaults.setCompilerOptions(compilerOptions);
ts.javascriptDefaults.setCompilerOptions({ ...compilerOptions, allowJs: true, checkJs: false, strict: false, noImplicitAny: false });
ts.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
ts.typescriptDefaults.setEagerModelSync(true);
ts.javascriptDefaults.setEagerModelSync(true);

loader.config({ monaco });

export { monaco };
