import * as fs from 'fs';
import * as path from 'path';

type GenericArg = {
    typeName: string;
    isExternal: boolean;
}

const PRISMA_SCHEMA_PATH = path.join(process.cwd(), 'prisma/basic/schema.prisma');

const OUTPUT_DIR = path.join(process.cwd(), 'src/util/prisma/generated');

function getOutputFilePath(prismaBaseTypeName: string): string {
    return path.join(OUTPUT_DIR, `prisma-model-${prismaBaseTypeName}-type.ts`);
}

/**
 * Prisma 스키마 파일에서 모든 모델명을 추출
 */
function extractModelNames(schemaPath: string): string[] {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // model 키워드로 시작하는 블록 찾기
    const modelRegex = /^\s*model\s+(\w+)\s*\{/gm;
    const models: string[] = [];
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
        models.push(match[1]);
    }

    return models.sort(); // 알파벳 순으로 정렬
}

function createTypeName(pattern: string, arg: string): string {
    return pattern.includes('{model}') ? pattern.replace('{model}', arg) : `${arg}${pattern}`;
}

/**
 * 타입 매핑 코드 생성
 */
function generateTypeMapping(models: string[], prismaBaseTypePattern: string, simpleGenericArgs?: GenericArg[], extraTypeArg?: string): string {

    const conditions = models.map(model => {
        let prismaType = `Prisma.${createTypeName(prismaBaseTypePattern, model)}`;
        if (simpleGenericArgs) {
            prismaType += `<${simpleGenericArgs.map(arg => arg.typeName).join(', ')}>`;
        }
        return `\t\tTModelName extends '${model}' ? ${prismaType} :`;
    }).join('\n');

    const modelName = createTypeName(prismaBaseTypePattern, 'PrismaModel');

    return `/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';

/**
 * Prisma ModelName으로부터 해당 모델의 ${modelName} 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: ${new Date().toISOString()}
 * 모델 개수: ${models.length}
 */
export type ${modelName}<TModelName extends Prisma.ModelName${(simpleGenericArgs ?? []).filter(arg => arg.isExternal).map(arg => `, ${arg.typeName}`).join('')}> = 
${conditions}
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        ${extraTypeArg ? extraTypeArg : 'Record<string, any>'};
  `;
}

function generatePrismaMappingTypeIndex(outputPaths: string[]) {

    // 상대 주소 생성
    // [Root]/src/util/prisma/generated/prisma-model-select-type.ts -> prisma-model-select-type
    const relativeAddresses = outputPaths.map(pathName => path.relative(OUTPUT_DIR, pathName));

    return `/**
   * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
   * 
   * 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
   * 
   * Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
   */
  
${relativeAddresses.map(address => path.extname(address) === '.ts' ? address.slice(0, -3) : address).map(address => `\texport * from './${address}';`).join('\n')}
  `;
}

export function generatePrismaTypes() {
    console.log('🔍 Prisma 스키마에서 모델명 추출 중...');

    if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
        console.error(`❌ Prisma 스키마 파일을 찾을 수 없습니다: ${PRISMA_SCHEMA_PATH}`);
        process.exit(1);
    }

    const models = extractModelNames(PRISMA_SCHEMA_PATH);
    console.log(`✅ ${models.length}개의 모델을 찾았습니다:`, models.join(', '));

    console.log('📝 타입 매핑 생성 중...');
    const map = new Map<string, string>();
    map.set('Select', generateTypeMapping(models, 'Select'));
    map.set('Delegate', generateTypeMapping(models, 'Delegate', [{ typeName: 'TOptions', isExternal: true }], 'unknown'));
    map.set('GetPayload', generateTypeMapping(models, 'GetPayload', [{ typeName: 'TSelect', isExternal: true }]));

    console.log(' 기존 OUTPUT_DIR 삭제 중...');
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    console.log(' 기존 OUTPUT_DIR 삭제 완료');
    console.log(' 새로운 OUTPUT_DIR 생성 중...');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(' 새로운 OUTPUT_DIR 생성 완료');

    const importReulsts = [];
    const outputPaths = [];
    map.forEach((typeMapping, key) => {
        const outputFilePath = getOutputFilePath(key.toLowerCase());
        // 출력 디렉토리 생성
        const outputDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 파일 작성
        fs.writeFileSync(outputFilePath, typeMapping, 'utf-8');
        console.log(`✅ 타입 매핑 파일이 생성되었습니다: ${outputFilePath}`);
        importReulsts.push(`import { ${key} } from './prisma-model-${key.toLowerCase()}-type';`);
        outputPaths.push(outputFilePath);
    });
    console.log('');
    console.log('📌 다음 단계:');
    console.log('   1. src/util/prisma/grphql-prisma-parser.util.ts 파일 열기');
    console.log(`   2. PrismaModelSelect 타입을 이 파일에서 import하도록 변경:`);
    console.log(`      ${importReulsts.join('\n')}`);
    console.log('   3. 기존의 조건부 타입 정의를 제거');

    const prismaMappingTypeIndex = generatePrismaMappingTypeIndex(outputPaths);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), prismaMappingTypeIndex, 'utf-8');
    console.log(`✅ Prisma 매핑 타입 인덱스 파일이 생성되었습니다: ${path.join(OUTPUT_DIR, 'index.ts')}`);
}

function main() {
    generatePrismaTypes();
}

main();