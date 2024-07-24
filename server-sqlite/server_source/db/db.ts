import { DataSource } from "typeorm";
import { User } from "./entities/user.entity.js";
import { AccessToken } from "./entities/accessToken.entity.js";
import { EnvManager } from "../env.js";
import { UserRepository } from "./repositories/user.repository.js";
import { AccessTokenRepository } from "./repositories/accessToken.repository.js";
import { ExtendedLog } from "../logging/extendedLog.js";

export class Database
{
    public static AppDataSource: DataSource | undefined = undefined;

    /** Create a Database data source from the env file. */
    public static createAppDataSource()
    {   
        if (!EnvManager.sqliteFilePath) throw new Error(`createAppDataSource: EnvManager.sqliteFilePath is not defined.`);
        Database.AppDataSource = new DataSource(
        {
            type: "sqlite",
            entities: [User, AccessToken],
            database: EnvManager.sqliteFilePath, 
            synchronize: true
        }); 
        return Database.AppDataSource;
    }

    public static async init()
    {
        if (!Database.AppDataSource) throw new Error(`Database.init: Database.AppDataSource is not defined. You might need to call Database.createAppDataSource before running this function.`);
        
        try { await Database.AppDataSource.initialize(); }
        catch(e)
        {
            ExtendedLog.logRed(`Error while initializing database. The database might contain entries violating database constrains.`);
            throw e;
        }

        // await UserRepository.getInstance().clear();
        // await AccessTokenRepository.getInstance().clear();

        // let accessToken = AccessTokenRepository.getInstance().create();
        // accessToken.creationDate = new Date();
        // accessToken.owner = <any>"41d03dc4-e74e-4e44-8efa-ee50df4b1f1e";
        // await AccessTokenRepository.getInstance().insert(accessToken);
        
        // let newUser = UserRepository.getInstance().create();
        // newUser.username = ''; 
        // await UserRepository.getInstance().insert(newUser);

        // await TransactionRepository.getInstance().clear();
        // await UserRepository.getInstance().clear();

        // const newUser = UserRepository.getInstance().create();
        // newUser.age = 727;
        // newUser.firstName = "First name";
        // newUser.lastName = "Last Name";
        // await UserRepository.getInstance().save(newUser);

        // const txn = TransactionRepository.getInstance().create();
        // txn.ownerUser = { id: "f6fd7709-d9b0-4e30-86bd-fa2a4b2785ba" } as User;
        // txn.title = "TITLE"; 
        // txn.toAmount = "1";
        // txn.fromAmount = "2"; 
        // await TransactionRepository.getInstance().save(txn);

        // // Performance
        // (async () => 
        // {
        //     await UserRepository.getInstance().clear();
        //     await UserFieldRepository.getInstance().clear();
    
        //     const rowsCount = 1790;
        //     const timeDiff1 = new TimeDiffer(`Creating ${rowsCount} rows: `);
        //     const postArray = [];
        //     for (let i = 0; i < rowsCount; i++)
        //     {
        //         let newUser = UserRepository.getInstance().create(); 
        //         newUser.id = "USER" + i;
        //         newUser.firstName = "firstname";
        //         newUser.lastName = "lastname";
        //         newUser.age = 1;
        //         postArray.push(newUser);
        //     }
        //     await UserRepository.getInstance().insert(postArray);
        //     timeDiff1.mark();
        
        //     const timeDiff2 = new TimeDiffer(`Reading ${rowsCount} rows: `);
        //     await UserRepository.getInstance().customFind();
        //     timeDiff2.mark();
    
        //     const timeDiff3 = new TimeDiffer(`Reading ${rowsCount} rows with conditions: `);
        //     console.log(await UserRepository.getInstance().createQueryBuilder()
        //     .where('id = "USER1705"')
        //     .getMany());
        //     timeDiff3.mark();   
        // })();


        // await UserRepository.clear();


    }
}