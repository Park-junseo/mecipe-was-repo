import { PrismaService } from 'src/global/prisma.service';
import { seedCafeInfoBigData, resetCafeInfoBigData } from './seed-cafeinfo-big-data';
import { getCommandParameters } from 'src/util/get-command-parameter';

export type PrismaServiceWithDatabaseUrl = PrismaService<{ datasourceUrl: string }>;
export type PrismaServiceOrDatabaseUrl = PrismaServiceWithDatabaseUrl|string;

export type SeedModuleAction = (repository: PrismaServiceOrDatabaseUrl, ...args: string[]) => Promise<void>;
export type SeedModule = {
    main: SeedModuleAction;
    reset: SeedModuleAction;
};

let prisma: PrismaServiceWithDatabaseUrl;

export const SeedModules = {
    'cafeinfo-big-data': {main: seedCafeInfoBigData, reset: resetCafeInfoBigData},
};
export type SeedModuleName = keyof typeof SeedModules;

export async function executeSeed(databaseUrl: string, argv: string[]) {
    const commandParameters = getCommandParameters('--seed', argv).filter(parameter => parameter.length > 0 && parameter[0] in SeedModules);

    if(commandParameters.length === 0) {
        throw new Error('❌ Seed module is required');
    }
    console.log('Database URL:', databaseUrl);
    prisma = new PrismaService({
        datasourceUrl: databaseUrl,
    });

    const resetFunctions: SeedModuleAction[] = [];
    for (const seedModuleArgs of commandParameters) {
        console.log('실행할 seed 파일:', seedModuleArgs[0]);
        let seedModuleName: SeedModuleName;
        try {
            seedModuleName = seedModuleArgs[0] as SeedModuleName;
            const seedModule = SeedModules[seedModuleName];
            if (!seedModule) {
                throw new Error(`❌ ${seedModuleName} seed module not found`);
            }
            resetFunctions.push(seedModule.reset);
            await seedModule.main(prisma, ...seedModuleArgs.slice(1));
            console.log('✅ Seeding completed');
        } catch (e) {
            console.error('❌ Seeding failed:', e);
            for (const resetFunction of resetFunctions) {
                await resetFunction(prisma);
            }
            throw new Error(`❌ ${seedModuleName} seeding failed`);
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

    const argv = args.slice(1);
    if (argv.length === 0) {
        console.error('❌ Seed file is required');
        process.exit(1);
    }

    executeSeed(databaseUrl, argv).then(() => {
        process.exit(0);
    }).catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    });
}