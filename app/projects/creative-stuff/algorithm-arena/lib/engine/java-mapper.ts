import { TestCase } from '../problems';
import { ExecutionResult } from './runner';
import { runJavascript } from './javascript';

export async function runJava(
  code: string,
  testCases: TestCase[],
  methodName: string
): Promise<ExecutionResult> {
  // Java to JS transformation
  let jsCode = code
    // 1. Handle array initializations: new int[]{1, 2} -> [1, 2]
    .replace(/new\s+\w+\[\]\s*{([^}]*)}/g, '[$1]')
    // 2. Handle empty array initializations: new int[5] -> new Array($1).fill(0)
    .replace(/new\s+\w+\[\s*([^\]]+)\s*\]/g, 'new Array($1).fill(0)')

    // 3. Remove access modifiers and static keywords
    .replace(/\b(public|private|protected|static|final|transient|volatile)\b/g, '')

    // 4. Standardized Entry Point Injection
    .replace(new RegExp(`\\b${methodName}\\b`, 'g'), '__solution_hook__')

    // 5. Remove Generics: ArrayList<Integer> -> ArrayList
    .replace(/<[\w\s,<>]*>/g, '')

    // 6. Handle Enhanced For-Loops: for (int n : nums) -> for (let n of nums)
    .replace(/for\s*\(([^:]+)\s*:\s*([^)]+)\)/g, 'for (let $1 of $2)')

    // 7. Map common Java methods/properties to JS equivalents (Early mapping for method names)
    .replace(/System\.out\.println\(([^)]*)\)/g, 'console.log($1)')
    .replace(/System\.out\.print\(([^)]*)\)/g, 'console.log($1)')
    .replace(/\.length\(\)/g, '.length')
    .replace(/\.size\(\)/g, '.size()')
    .replace(/\.isEmpty\(\)/g, '.isEmpty()')
    .replace(/\.add\(/g, '.add(')
    .replace(/\.get\(/g, '.get(')
    .replace(/\.put\(/g, '.put(')
    .replace(/\.containsKey\(/g, '.containsKey(')
    .replace(/\.offer\(/g, '.offer(')
    .replace(/\.poll\(\)/g, '.poll()')
    .replace(/\.peek\(\)/g, '.peek()')
    .replace(/Integer\.MAX_VALUE/g, 'Infinity')
    .replace(/Integer\.MIN_VALUE/g, '-Infinity')
    .replace(/new\s+Scanner\(System\.in\)/g, '{}');

    // 8. Handle variable declarations with types: int i = 0 -> let i = 0
    // We replace the type with 'let'
    const types = 'int|double|float|long|short|byte|boolean|char|String|Integer|Double|Boolean|List|Map|Set|ArrayList|HashMap|HashSet|Stack|Queue|PriorityQueue|LinkedList|Deque';
    jsCode = jsCode.replace(new RegExp(`\\b(${types})\\s*(\\[\\])?\\s+(\\w+)\\b`, 'g'), 'let $3');

    // 9. Clean up method signatures (remove 'let' from parameters)
    // function solve(let nums, let target) -> function solve(nums, target)
    jsCode = jsCode.replace(/\((let\s+[^)]+)\)/g, (match, content) => {
        return '(' + content.replace(/let\s+/g, '') + ')';
    });
    // Handle multiple parameters: solve(nums, let target)
    jsCode = jsCode.replace(/,\s*let\s+/g, ', ');

    // 10. Clean up method return types that might have been prefixed with 'let'
    // let solve(nums) -> solve(nums)
    jsCode = jsCode.replace(/let\s+(\w+)\s*\(/g, '$1(');

  return runJavascript(jsCode, testCases, '__solution_hook__', true);
}
