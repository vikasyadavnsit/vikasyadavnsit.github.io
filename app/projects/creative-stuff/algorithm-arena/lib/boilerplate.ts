import { Language } from './problems';

export function generateBoilerplate(
  methodName: string,
  parameters: string[],
  language: Language
): string {
  const params = parameters.join(', ');

  switch (language) {
    case 'javascript':
      return `/**
 * @param {any} ${parameters.join('\n * @param {any} ')}
 * @return {any}
 */
function ${methodName}(${params}) {
    // Write your code here
}`;

    case 'java':
      return `class Solution {
    public Object ${methodName}(${parameters.map(p => `Object ${p}`).join(', ')}) {
        // Write your code here
        return null;
    }
}`;

    default:
      return '';
  }
}
