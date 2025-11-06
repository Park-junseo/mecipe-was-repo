import { PrismaService } from 'src/global/prisma.service';
import { seedCafeInfoBigData, resetCafeInfoBigData } from './seed-cafeinfo-big-data';

export type SeedModuleAction = (repository: PrismaService|{ databaseUrl: string }) => Promise<void>;
export type SeedModule = {
    main: SeedModuleAction;
    reset: SeedModuleAction;
};

let prisma: PrismaService;

export const seedModules: Record<string, SeedModule> = {
    'cafeinfo-big-data': {main: seedCafeInfoBigData, reset: resetCafeInfoBigData},
};
export type seedModuleName = keyof typeof seedModules;

// [--seed:cafeinfo-big-data] ==> ['cafeinfo-big-data']
// [--seed:cafeinfo-big-data, --seed:cafeinfo-big-data] ==> ['cafeinfo-big-data', 'cafeinfo-big-data']
export function getSeedModules(parameters: string[]): seedModuleName[] {
    const seedModuleNames: seedModuleName[] = [];
    for (const parameter of parameters) {
        if (parameter.startsWith('--seed:')) {
            const parameterName = parameter.split(':')[1] || '';
            if (parameterName in seedModules) {
                seedModuleNames.push(parameterName);
            }
        }
    }
    if (seedModuleNames.length === 0) {
        throw new Error('존재하지 않는 seed 파일입니다.');
    }
    return seedModuleNames;
}

export async function executeSeed(databaseUrl: string, seedFiles: string[]) {
    console.log('Database URL:', databaseUrl);
    prisma = new PrismaService({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });

    const resetFunctions: SeedModuleAction[] = [];
    for (const seedFile of seedFiles) {
        console.log('실행할 seed 파일:', seedFile);
        try {
            const seedModule = seedModules[seedFile];
            if (!seedModule) {
                console.log('존재하지 않는 seed 파일입니다.');
                throw new Error('존재하지 않는 seed 파일입니다.');
            }
            resetFunctions.push(seedModule.reset);
            await seedModule.main(prisma);
            console.log('✅ Seeding completed');
        } catch (e) {
            console.error('❌ Seeding failed:', e);
            for (const resetFunction of resetFunctions) {
                await resetFunction(prisma);
            }
            throw new Error(`${seedFile} seeding failed`);
        }
    }
}



if (require.main === module) {
    const args = process.argv.slice(2);

    const databaseUrl = args[0];
    if (!databaseUrl || !/\w+:\/\/\w+:\w+@\w+:\d+\/\w+/.test(databaseUrl)) {
        console.error('❌ Database URL is required or invalid');
        process.exit(1);
    }

    const seedFiles = args.slice(1);
    if (seedFiles.length === 0) {
        console.error('❌ Seed file is required');
        process.exit(1);
    }

    executeSeed(databaseUrl, seedFiles).then(() => {
        process.exit(0);
    }).catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    });
}