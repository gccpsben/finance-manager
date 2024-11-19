
import { Faker, en, zh_CN, zh_TW, ja, base } from '@faker-js/faker';

export class Generator
{
    public static randUniqueName(usedNames: string[] = [])
    {
        function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

        let currentName = "";
        do
        {
            const faker = new Faker({ locale: [choice([zh_CN, zh_TW, ja]), en, base], });
            currentName =
            [
                faker.string.sample({min: 5, max: 100}),
                faker.person.middleName(),
                faker.person.jobTitle(),
                faker.person.lastName(),
                faker.person.bio(),
                faker.finance.accountName()
            ].join('');
        }
        while(usedNames.includes(currentName));
        return currentName;
    }
}