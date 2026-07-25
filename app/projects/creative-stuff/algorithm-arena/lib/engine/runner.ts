import { Language, Problem } from '../problems';
import { runJavascript } from './javascript';
import { runJava } from './java-mapper';

export interface ExecutionResult {
  success: boolean;
  results: {
    passed: boolean;
    input: any[];
    expected: any;
    actual: any;
    error?: string;
  }[];
  console: string[];
  totalPassed: number;
  totalTests: number;
  time?: number;
}

export async function runCode(
  code: string,
  language: Language,
  problem: Problem
): Promise<ExecutionResult> {
  const startTime = performance.now();
  let result: ExecutionResult;

  switch (language) {
    case 'javascript':
      result = await runJavascript(code, problem.testCases, problem.methodName);
      break;
    case 'java':
      result = await runJava(code, problem.testCases, problem.methodName);
      break;
    default:
      throw new Error(`Language ${language} not supported`);
  }

  result.time = performance.now() - startTime;
  return result;
}
