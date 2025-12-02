/**
 * 따옴표나 쌍따옴표로 감싸진 부분을 고려하여 문자열을 파싱합니다.
 * @param str 파싱할 문자열
 * @param delimiter 구분자 (기본값: ':')
 * @returns 파싱된 문자열 배열
 */
function parseWithQuotes(str: string, delimiter: string = ':'): string[] {
  const result: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    // 따옴표 처리
    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote) {
        // 따옴표 종료
        inSingleQuote = false;
      } else {
        // 따옴표 시작
        inSingleQuote = true;
      }
      i++;
      continue;
    } else if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote) {
        // 쌍따옴표 종료
        inDoubleQuote = false;
      } else {
        // 쌍따옴표 시작
        inDoubleQuote = true;
      }
      i++;
      continue;
    }

    // 구분자 처리 (따옴표 밖에서만)
    if (char === delimiter && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        result.push(current);
        current = '';
      }
      i++;
      continue;
    }

    // 일반 문자 추가
    current += char;
    i++;
  }

  // 마지막 부분 추가
  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * --seed: 파라미터를 파싱하여 2차원 배열로 변환합니다.
 * @param command 명령어
 * @param parameters 명령줄 파라미터 배열
 * @param delimiter 구분자 (기본값: ':')
 * @returns 2차원 문자열 배열
 *
 * @example
 * // ['--seed:cafeinfo-big-data'] ==> [['cafeinfo-big-data']]
 * // ['--seed:cafeinfo-big-data:"2"]'] ==> [['cafeinfo-big-data', '2']]
 * // ['--seed:cafeinfo-big-data:'hello world']'] ==> [['cafeinfo-big-data', 'hello world']]
 * // ['--seed:cafeinfo-big-data', '--seed:cafeinfo-big-data:"2"']] ==> [['cafeinfo-big-data'], ['cafeinfo-big-data', '2']]
 */
export function getCommandParameters(
  command: string,
  parameters: string[],
  delimiter: string = ':',
): string[][] {
  const result: string[][] = [];

  for (const parameter of parameters) {
    if (parameter.startsWith(`${command}:`)) {
      // --seed: 제거
      const seedPart = parameter.substring(`${command}:`.length);

      // URL 패턴 감지: http:// 또는 https://로 시작하면 전체를 하나의 값으로 처리
      const isUrlPattern = /^https?:\/\//.test(seedPart.trim());

      if (isUrlPattern) {
        // URL인 경우 전체를 하나의 값으로 처리
        result.push([seedPart.trim()]);
        continue;
      }

      // 따옴표를 고려하여 파싱
      const parsed = parseWithQuotes(seedPart, delimiter);

      // 따옴표 제거 (값에서만)
      const cleaned = parsed.map((part, index) => {
        // 첫 번째는 모듈 이름 (따옴표 없음)
        if (index === 0) {
          return part;
        }
        // 나머지는 값 (따옴표 제거)
        const trimmed = part.trim();
        if (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          return trimmed.slice(1, -1);
        }
        return trimmed;
      });

      if (cleaned.length > 0) {
        result.push(cleaned);
      }
    }
  }

  if (result.length === 0) {
    throw new Error('❌ 존재하지 않는 명령어입니다.');
  }

  return result;
}
