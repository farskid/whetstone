// The stage contract check in the browser (src/runner/contract.ts): Monaco's TypeScript worker, which already
// type-checks the editor, checks the hidden contract file against the user's solution model and the types model.
import { monaco } from '../monaco';
import { explainContract, parseContract, type ContractFailure } from '../runner/contract';

type Chain = string | { messageText: string; next?: Chain[] };
const flatten = (m: Chain, depth = 0): string[] =>
  typeof m === 'string' ? [m] : [`${'  '.repeat(depth)}${m.messageText}`, ...(m.next ?? []).flatMap((n) => flatten(n, depth + 1))];

/**
 * Type-checks `contractTs` as file:///problems/<id>/contract.ts next to the user's solution.ts and the stage's
 * types.ts models, and returns the checks that fail (empty when the code meets the contract).
 */
export async function checkContract(problemId: string, contractTs: string, solution: monaco.Uri): Promise<ContractFailure[]> {
  const uri = monaco.Uri.parse(`file:///problems/${problemId}/contract.ts`);
  const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(contractTs, 'typescript', uri);
  if (model.getValue() !== contractTs) model.setValue(contractTs);
  try {
    const getWorker = await monaco.typescript.getTypeScriptWorker();
    const worker = await getWorker(uri, solution);
    const file = uri.toString();
    const diags = [...await worker.getSyntacticDiagnostics(file), ...await worker.getSemanticDiagnostics(file)];
    return explainContract(parseContract(contractTs), diags.map((d) => ({
      line: model.getPositionAt(d.start ?? 0).lineNumber,
      message: flatten(d.messageText as Chain).join('\n'),
    })));
  } finally {
    model.dispose();
  }
}

const OWNER = 'contract';

/** Underlines the user's declaration of each failing check's first key they declare (`name`, or `Class.member`), else line 1. */
export function markContract(model: monaco.editor.ITextModel, failures: ContractFailure[]) {
  const lines = model.getLinesContent();
  const find = (re: RegExp, from = 0) => { for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i; return -1; };
  const declLine = (key: string) => {
    const [name, member] = key.split('.');
    let line = find(new RegExp(`^\\s*export\\s+(?:default\\s+)?(?:declare\\s+)?(?:async\\s+)?(?:abstract\\s+)?(?:function\\*?|class|const|let|var|interface|type)\\s+${name.replace(/[#'].*$/, '')}\\b`));
    if (line >= 0 && member) {
      const m = find(new RegExp(`^\\s+(?:(?:public|static|async|readonly|get|set)\\s+)*${member.replace(/'+$/, '')}\\s*[(<]`), line + 1);
      if (m >= 0) line = m;
    }
    return line;
  };
  const markers = failures.map((f) => {
    // The first key the user's code declares (a key can name a type that lives in types.ts).
    const line = f.keys.map(declLine).find((l) => l >= 0) ?? -1;
    const at = line < 0 ? 0 : line;
    const text = lines[at] ?? '';
    const start = text.length - text.trimStart().length + 1;
    return {
      severity: monaco.MarkerSeverity.Error,
      message: `${f.message}\n\n${f.details.join('\n')}`,
      startLineNumber: at + 1, startColumn: start, endLineNumber: at + 1, endColumn: Math.max(start + 1, text.length + 1),
      source: 'stage contract',
    };
  });
  monaco.editor.setModelMarkers(model, OWNER, markers);
}

export function clearContractMarks(model: monaco.editor.ITextModel | null | undefined) {
  if (model) monaco.editor.setModelMarkers(model, OWNER, []);
}
