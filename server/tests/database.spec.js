const initBase = require('./init.spec');
const mongoUnit = require('mongo-unit');

(() => 
{
    const testData = require('./testData.json');
    const accessToken = require('../server_build/finance/accessToken');

    describe('Database Access', () =>
    {
        let runTests = () => 
        {
            beforeEach(async () => { await mongoUnit.load(testData) })
            
            afterEach(() => mongoUnit.drop())

            it('Find AccessToken count: 1', () => 
            {
                return accessToken.AccessTokenClassModel.find({})
                .then(tokens => { initBase.expect(tokens.length).to.equal(1) })
            })
        };

        try { runTests() } catch(e) { console.log(e); };
    });
})();