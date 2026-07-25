import { TestCase } from '../problems';
import { ExecutionResult } from './runner';
import { JAVA_STD_LIB } from './java-std';

export async function runJavascript(
  code: string,
  testCases: TestCase[],
  methodName: string,
  isJava: boolean = false
): Promise<ExecutionResult> {
  const logs: string[] = [];
  const originalLog = console.log;

  // Intercept console.log
  console.log = (...args: any[]) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };

  const results: ExecutionResult['results'] = [];
  let totalPassed = 0;

  try {
    // 1. Check for the standardized hook injected by mappers
    // 2. Check for the specific methodName
    // 3. Check inside Solution class/object
    // 4. Last resort: Find any function if only one exists
    const wrappedCode = `
      ${isJava ? JAVA_STD_LIB : ''}
      ${code}

      let targetFn = null;

      if (typeof __solution_hook__ === 'function') {
        targetFn = __solution_hook__;
      }
      else if (typeof ${methodName} === 'function') {
        targetFn = ${methodName};
      }
      else if (typeof Solution !== 'undefined') {
        const sol = (typeof Solution === 'function') ? new Solution() : Solution;
        if (sol && typeof sol.${methodName} === 'function') {
          targetFn = sol.${methodName}.bind(sol);
        } else if (sol && typeof sol.__solution_hook__ === 'function') {
          targetFn = sol.__solution_hook__.bind(sol);
        }
      }

      if (!targetFn) {
        const functions = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'Function' && k !== 'eval' && k !== 'ArrayList' && k !== 'HashMap' && k !== 'HashSet' && k !== 'Stack' && k !== 'LinkedList' && k !== 'PriorityQueue');
        if (functions.length === 1) targetFn = this[functions[0]];
      }

      return targetFn;
    `;

    const userFn = new Function(wrappedCode)();

    if (typeof userFn !== 'function') {
      throw new Error(`Could not find a valid solution method. Expected '${methodName}' or a Solution class.`);
    }

    for (const test of testCases) {
      let actual;
      let passed = false;
      let error: string | undefined;

      try {
        const inputCopy = JSON.parse(JSON.stringify(test.input));
        actual = userFn(...inputCopy);

        passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        if (passed) totalPassed++;
      } catch (e: any) {
        error = e.message;
      }

      results.push({
        passed,
        input: test.input,
        expected: test.expected,
        actual,
        error
      });
    }

  } catch (e: any) {
    results.push({
      passed: false,
      input: [],
      expected: null,
      actual: null,
      error: e.message
    });
  } finally {
    console.log = originalLog;
  }

  return {
    success: results.length > 0 && results.every(r => r.passed),
    results,
    console: logs,
    totalPassed,
    totalTests: testCases.length
  };
}
